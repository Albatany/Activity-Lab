"""Exercise publication boundaries without a GitHub account or network access."""
from contextlib import ExitStack
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import tarfile
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("publication", root / "scripts" / "publish.py")
publication = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publication)


class ReleaseTests(unittest.TestCase):
    def test_failed_tag_must_be_older(self):
        check = publication.requested_cleanup
        self.assertEqual(check("4.1.1", ""), "")
        self.assertEqual(check("4.1.1", "v4.1.0"), "v4.1.0")
        for invalid in ("v4.1.1", "v10.0.0", "*", "main", "v4.01.0"):
            with self.subTest(tag=invalid), self.assertRaises(ValueError):
                check("4.1.1", invalid)

    def test_npm_archive(self):
        pkg = json.loads((root / "package.json").read_text())
        with TemporaryDirectory() as tmp:
            stage = Path(tmp)
            name, asset = publication.stage_package(stage, "Example/Activity-Lab", pkg)
            result = subprocess.check_output(["npm", "pack", "--offline", "--ignore-scripts", "--json"], cwd=stage)
            with tarfile.open(stage / json.loads(result)[0]["filename"]) as tar:
                self.assertEqual(tar.extractfile("package/" + asset).read(), (root / "release" / asset).read_bytes())
                metadata = json.load(tar.extractfile("package/package.json"))
                self.assertEqual(metadata["name"], "@example/activity-lab")
                self.assertEqual(metadata["name"], name)
                self.assertEqual(metadata["version"], pkg["version"])
                self.assertEqual(tar.extractfile("package/SHA256SUMS.txt").read(), (stage / "SHA256SUMS.txt").read_bytes())

    def test_cleanup_targets_exact_version(self):
        calls = []
        def api(endpoint, *args, **kwargs):
            if "DELETE" in args:
                calls.append(endpoint)
            elif endpoint == "pkg":
                return {"repository": {"full_name": "demo/activity-lab"}}
            elif "/versions?" in endpoint:
                return [[{"name": "4.0.0", "id": 10}], [{"name": "4.1.0", "id": 15}, {"name": "4.1.1", "id": 20}]]
            return {"id": 7}

        with patch.object(publication, "api", side_effect=api):
            publication.remove_failed("demo/activity-lab", "pkg", "v4.1.0")
        self.assertEqual(calls, ["pkg/versions/15", "repos/demo/activity-lab/releases/7",
                                 "repos/demo/activity-lab/git/refs/tags/v4.1.0"])


    def test_resume_draft_and_verify_both_assets(self):
        repo, tag, sha = "demo/lab", "v4.1.1", "abc"
        release = {"id": 3, "tag_name": tag, "draft": True, "prerelease": False,
                   "html_url": "https://example.invalid/release", "assets": [{"name": "installer.vsix"}]}
        uploaded = {"installer.vsix": b"installer"}
        calls = []
        def api(endpoint, *args, **kw):
            if "/commits/" in endpoint:
                return {"sha": sha}
            if "git/ref/tags" in endpoint:
                return {"ref": tag}
            if "releases/tags" in endpoint:
                return None if release["draft"] else release
            return [[release]]
        def gh(*args):
            verb = args[2]
            calls.append(verb)
            if verb == "download":
                name = args[args.index("--pattern") + 1]
                (Path(args[args.index("--dir") + 1]) / name).write_bytes(uploaded[name])
            elif verb == "upload":
                path = Path(args[4])
                uploaded[path.name] = path.read_bytes()
                release["assets"].append({"name": path.name})
            elif verb == "edit":
                release["draft"] = False
            else:
                self.fail(f"Unexpected gh operation: {verb}")
        with TemporaryDirectory() as tmp, patch.object(publication, "api", side_effect=api), patch.object(publication, "command", side_effect=gh):
            stage = Path(tmp) / "stage"
            stage.mkdir()
            (stage / "installer.vsix").write_bytes(b"installer")
            (stage / "SHA256SUMS.txt").write_bytes(b"digest")
            params = (repo, tag, sha, stage, Path(tmp), ["installer.vsix", "SHA256SUMS.txt"], Path(tmp) / "notes")
            publication.publish_release(*params)
            self.assertEqual(calls, ["download", "upload", "download", "edit"])
            calls.clear()
            publication.publish_release(*params)
            self.assertEqual(calls, ["download", "download"])
            uploaded["installer.vsix"] = b"wrong bytes"
            with self.assertRaises(ValueError):
                publication.publish_release(*params)


    def test_cleanup_follows_both_verifications(self):
        def api(endpoint, *args, **kwargs):
            return {"owner": {"type": "User", "login": "Example"}} if endpoint == "repos/Example/Lab" else None
        for failed, fault in [("", None), ("v4.0.0", None), ("v4.0.0", "package"), ("v4.0.0", "release")]:
            with self.subTest(failed=failed, fault=fault), ExitStack() as stack:
                events = []
                def record(event):
                    def callback(*args):
                        events.append(event)
                        if event == fault:
                            raise ValueError("Simulated verification failure.")
                    return callback
                stack.enter_context(patch.dict(os.environ, {"GITHUB_REPOSITORY": "Example/Lab",
                                         "GITHUB_SHA": "demo", "FAILED_TAG": failed}))
                for key, action in [("command", lambda *args, **kw: "demo"), ("api", api),
                                    ("publish_package", record("package")), ("publish_release", record("release")),
                                    ("remove_failed", record("delete"))]:
                    stack.enter_context(patch.object(publication, key, side_effect=action))
                if fault:
                    with self.assertRaises(ValueError):
                        publication.main()
                else:
                    publication.main()
                expected = ["package"] if fault == "package" else ["package", "release"]
                if failed and not fault:
                    expected.append("delete")
                self.assertEqual(events, expected)


if __name__ == "__main__":
    unittest.main()

