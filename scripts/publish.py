"""Publish matching GitHub Release and npm artifacts from the checked-out revision."""
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = "https://npm.pkg.github.com"
STABLE = r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"


def requested_cleanup(version, tag):
    current = re.fullmatch(STABLE, version)
    if not current:
        raise ValueError("Set a stable release version in package.json.")
    if not tag:
        return ""
    old = re.fullmatch("v" + STABLE, tag)
    if not old or tuple(map(int, old.groups())) >= tuple(map(int, current.groups())):
        raise ValueError("The failed tag must name an older version, such as v4.1.0.")
    return tag


def command(*args, cwd=None):
    return subprocess.check_output(args, cwd=cwd, text=True).strip()


def api(endpoint, *args, optional=False):
    result = subprocess.run(["gh", "api", endpoint, *args], capture_output=True, text=True)
    if result.returncode:
        if optional and "(HTTP 404)" in result.stderr:
            return None
        raise RuntimeError(result.stderr.strip() or "GitHub API request failed.")
    return json.loads(result.stdout) if result.stdout.strip() else None


def stage_package(directory, repo, pkg):
    name = f"@{repo.split('/')[0].lower()}/activity-lab"
    vsix = f"{pkg['name']}-{pkg['version']}.vsix"
    shutil.copyfile(ROOT / "release" / vsix, directory / vsix)
    shutil.copyfile(ROOT / "LICENSE", directory / "LICENSE")
    digest = hashlib.sha256((directory / vsix).read_bytes()).hexdigest()
    (directory / "SHA256SUMS.txt").write_bytes(f"{digest}  {vsix}\n".encode())
    (directory / "README.md").write_text(
        f"# Activity Lab\n\nThis package contains `{vsix}`. Extract it and select "
        f"**Install from VSIX** in Visual Studio Code.\n\n[Source and releases](https://github.com/{repo})\n",
        encoding="utf-8")
    metadata = {
        "name": name, "version": pkg["version"], "description": pkg["description"], "license": pkg["license"],
        "repository": {"type": "git", "url": f"git+https://github.com/{repo}.git"},
        "publishConfig": {"registry": REGISTRY}, "files": [vsix, "SHA256SUMS.txt"]
    }
    (directory / "package.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return name, vsix


def publish_package(stage, download, existing, spec, assets):
    if not existing:
        command("npm", "publish", "--registry", REGISTRY, "--ignore-scripts", cwd=stage)
    packed = json.loads(command("npm", "pack", spec, "--registry", REGISTRY, "--ignore-scripts",
                                "--prefer-online", "--json", cwd=download))
    with tarfile.open(download / packed[0]["filename"], "r:gz") as archive:
        for asset in assets:
            if archive.extractfile("package/" + asset).read() != (stage / asset).read_bytes():
                raise ValueError(f"Published npm content differs for {asset}. Choose a new version.")
    print(f"Verified GitHub Packages download for {spec}.")


def find_release(base, tag):
    published = api(f"{base}/releases/tags/{tag}", optional=True)
    if published:
        return published
    # GitHub's tag lookup covers published releases. The list also includes accessible drafts.
    pages = api(f"{base}/releases?per_page=100", "--paginate", "--slurp")
    return next((r for page in pages for r in page if r["tag_name"] == tag), None)


def publish_release(repo, tag, sha, stage, download, assets, notes):
    base = f"repos/{repo}"
    ref = api(f"{base}/git/ref/tags/{tag}", optional=True)
    if ref:
        if api(f"{base}/commits/{tag}")["sha"] != sha:
            raise ValueError(f"{tag} already points to a different commit.")
    else:
        api(f"{base}/git/refs", "-X", "POST", "-f", f"ref=refs/tags/{tag}", "-f", f"sha={sha}")

    release = find_release(base, tag)
    if not release:
        command("gh", "release", "create", tag, "--repo", repo, "--draft", "--verify-tag",
                "--title", f"Activity Lab {tag[1:]}", "--notes-file", str(notes))
        release = find_release(base, tag)
        if not release:
            raise ValueError(f"Could not read the draft for {tag}.")
    existing = {asset["name"] for asset in release["assets"]}
    for asset in assets:
        if asset not in existing:
            command("gh", "release", "upload", tag, str(stage / asset), "--repo", repo)
        command("gh", "release", "download", tag, "--repo", repo, "--pattern", asset, "--dir", str(download))
        if (download / asset).read_bytes() != (stage / asset).read_bytes():
            raise ValueError(f"The release asset {asset} differs from this build.")
    if release["draft"]:
        command("gh", "release", "edit", tag, "--repo", repo, "--draft=false", "--latest")
    published = api(f"{base}/releases/tags/{tag}")
    if published["draft"] or published["prerelease"]:
        raise ValueError(f"{tag} is not a published stable release.")
    print(f"Verified {published['html_url']}.")


def versions(endpoint):
    pages = api(endpoint + "/versions?per_page=100", "--paginate", "--slurp")
    return {version["name"]: version["id"] for page in pages for version in page}


def require_link(package, repo):
    if (package.get("repository") or {}).get("full_name", "").lower() != repo.lower():
        raise ValueError("The npm package must be linked to this repository. Check its package settings.")


def remove_failed(repo, endpoint, tag):
    require_link(api(endpoint), repo)
    base = f"repos/{repo}"
    release = find_release(base, tag)
    if release and release.get("immutable"):
        raise ValueError(f"GitHub has locked {tag} as an immutable release.")
    by_version = versions(endpoint)
    if tag[1:] in by_version:
        api(f"{endpoint}/versions/{by_version[tag[1:]]}", "-X", "DELETE")
    if release:
        api(f"{base}/releases/{release['id']}", "-X", "DELETE")
    if api(f"{base}/git/ref/tags/{tag}", optional=True):
        api(f"{base}/git/refs/tags/{tag}", "-X", "DELETE")
    print(f"Finished cleanup for {tag} in {repo}.")


def main():
    pkg = json.loads((ROOT / "package.json").read_text())
    version = pkg["version"]
    failed = requested_cleanup(version, os.environ.get("FAILED_TAG", ""))
    repo = os.environ["GITHUB_REPOSITORY"]
    sha = os.environ["GITHUB_SHA"]
    tag = "v" + version
    notes = ROOT / "docs" / "releases" / (tag + ".md")
    if command("git", "rev-parse", "HEAD", cwd=ROOT) != sha or not notes.is_file():
        raise ValueError("Check out the workflow commit and add the matching release notes.")
    base = f"repos/{repo}"
    if api(f"{base}/git/ref/tags/{tag}", optional=True) and api(f"{base}/commits/{tag}")["sha"] != sha:
        raise ValueError(f"{tag} already belongs to another commit. Bump the version.")
    owner = api(base)["owner"]
    namespace = "orgs" if owner["type"] == "Organization" else "users"
    endpoint = f"{namespace}/{owner['login']}/packages/npm/activity-lab"
    package = api(endpoint, optional=True)
    if package:
        require_link(package, repo)
    existing = package is not None and version in versions(endpoint)
    with TemporaryDirectory() as temp:
        directory = Path(temp)
        stage = directory / "package"
        stage.mkdir()
        name, vsix = stage_package(stage, repo, pkg)
        assets = [vsix, "SHA256SUMS.txt"]
        publish_package(stage, directory, existing, f"{name}@{version}", assets)
        publish_release(repo, tag, sha, stage, directory, assets, notes)
    if failed:
        remove_failed(repo, endpoint, failed)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, ValueError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))

