"""Build the local VSIX from the package manifest and checked-in source."""
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from xml.etree import ElementTree as ET
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

root = Path(__file__).resolve().parents[1]
pkg = json.loads((root / "package.json").read_text(encoding="utf-8"))
target = root / "release" / f"{pkg['name']}-{pkg['version']}.vsix"
target.parent.mkdir(exist_ok=True)
manifest = ET.Element("PackageManifest", Version="2.0.0",
                      xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011")
metadata = ET.SubElement(manifest, "Metadata")
ET.SubElement(metadata, "Identity", Id=pkg["name"], Version=pkg["version"],
              Language="en-US", Publisher=pkg["publisher"])
for tag, value in (("DisplayName", pkg["displayName"]), ("Description", pkg["description"]),
                   ("Tags", ",".join(pkg["keywords"])), ("Categories", ",".join(pkg["categories"]))):
    ET.SubElement(metadata, tag).text = value
ET.SubElement(metadata, "Icon").text = "extension/" + pkg["icon"]
props = ET.SubElement(metadata, "Properties")
ET.SubElement(props, "Property", Id="Microsoft.VisualStudio.Code.Engine", Value=pkg["engines"]["vscode"])
install = ET.SubElement(manifest, "Installation")
ET.SubElement(install, "InstallationTarget", Id="Microsoft.VisualStudio.Code")
ET.SubElement(manifest, "Dependencies")
assets = ET.SubElement(manifest, "Assets")
for kind, path in (("Microsoft.VisualStudio.Code.Manifest", "package.json"),
                   ("Microsoft.VisualStudio.Services.Icons.Default", pkg["icon"]),
                   ("Microsoft.VisualStudio.Services.Content.Details", "README.md"),
                   ("Microsoft.VisualStudio.Services.Content.License", "LICENSE"),
                   ("Microsoft.VisualStudio.Services.Content.Changelog", "CHANGELOG.md")):
    ET.SubElement(assets, "Asset", Type=kind,
                  Path=f"extension/{path}", Addressable="true")

types = ET.Element("Types", xmlns="http://schemas.openxmlformats.org/package/2006/content-types")
for ext, mime in (("vsixmanifest", "text/xml"), ("js", "application/javascript"),
                  ("json", "application/json"), ("md", "text/markdown"), ("png", "image/png")):
    ET.SubElement(types, "Default", Extension=ext, ContentType=mime)
ET.SubElement(types, "Override", PartName="/extension/LICENSE", ContentType="text/plain")

files = [*root.glob("*.js"), root / "package.json", root / "languages.json", *root.glob("*.md"),
         root / "LICENSE", root / pkg["icon"], *(root / "docs").rglob("*.md")]
with TemporaryDirectory(dir=target.parent) as temp_dir:
    staged = Path(temp_dir) / target.name
    with ZipFile(staged, "w", ZIP_DEFLATED) as archive:
        # Fixed ZIP metadata keeps the same release verifiable across fresh checkouts.
        def write(name, data):
            member = ZipInfo(name)
            member.create_system = 3
            member.external_attr = 0o100644 << 16
            archive.writestr(member, data, compress_type=ZIP_DEFLATED)

        write("[Content_Types].xml", ET.tostring(types, encoding="utf-8", xml_declaration=True))
        write("extension.vsixmanifest", ET.tostring(manifest, encoding="utf-8", xml_declaration=True))
        for path in sorted(files):
            write("extension/" + path.relative_to(root).as_posix(), path.read_bytes())
    staged.replace(target)
print(target.relative_to(root))
