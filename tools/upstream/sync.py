#!/usr/bin/env python3
"""保存原作者发布快照，并用显式补丁生成可独立部署的 upstream/。"""
import argparse
import hashlib
import json
import re
from pathlib import Path, PurePosixPath
import shutil
import tempfile
from urllib.parse import urlsplit
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
TOOLS = ROOT / "tools" / "upstream"
SNAPSHOT = TOOLS / "snapshot"
MANIFEST = TOOLS / "source.json"
PATCHES = TOOLS / "patches.json"
OVERLAYS = TOOLS / "overlays"
OUTPUT = ROOT / "upstream"
LOCAL_DOCS = {"README.md", "AGENTS.md"}


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def safe_path(name):
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts or "\\" in name or not path.parts:
        raise ValueError(f"无效的快照相对路径: {name}")
    if name in LOCAL_DOCS or name == "snapshot.json":
        raise ValueError(f"快照不能覆盖本地维护文件: {name}")
    return name


def render(manifest, source=SNAPSHOT):
    files = {}
    metadata = []
    expected = {entry["path"] for entry in manifest["files"]}
    actual = {path.relative_to(source).as_posix() for path in source.rglob("*") if path.is_file()}
    if actual != expected:
        raise ValueError(f"快照文件清单不匹配: missing={expected - actual}, extra={actual - expected}")
    for entry in manifest["files"]:
        name = safe_path(entry["path"])
        if name in files:
            raise ValueError(f"重复路径: {name}")
        data = (source / name).read_bytes()
        if digest(data) != entry["sha256"]:
            raise ValueError(f"原始快照校验失败: {name}")
        files[name] = data
        metadata.append(dict(entry))
    version = re.search(rb"\bweb_ver\s*=\s*(\d+)", files["refresh.js"])
    if not version or int(version[1]) != manifest["web_version"]:
        raise ValueError("refresh.js 与记录的网页版本不一致")
    for patch in read_json(PATCHES)["patches"]:
        name = safe_path(patch["path"])
        old, new = patch["old"].encode(), patch["new"].encode()
        if not old or files[name].count(old) != patch["count"]:
            raise ValueError(f"补丁上下文不匹配: {name}: {patch['reason']}")
        files[name] = files[name].replace(old, new)
    for path in sorted(OVERLAYS.rglob("*")):
        if path.is_file():
            name = safe_path(path.relative_to(OVERLAYS).as_posix())
            if name in files:
                raise ValueError(f"覆盖文件与原始快照冲突: {name}")
            files[name] = path.read_bytes()
            metadata.append({"path": name, "kind": "local-overlay"})
    for entry in metadata:
        entry["deployed_sha256"] = digest(files[entry["path"]])
    index = {key: manifest[key] for key in ["schema_version", "origin", "snapshot_date", "web_version"]}
    index["files"] = sorted(metadata, key=lambda entry: entry["path"])
    files["snapshot.json"] = (json.dumps(index, ensure_ascii=False, indent=2) + "\n").encode()
    return files


def write_output(files, output):
    previous = output / "snapshot.json"
    old_paths = {entry["path"] for entry in read_json(previous)["files"]} if previous.exists() else set()
    for name in old_paths - files.keys():
        path = output / safe_path(name)
        if path.is_file():
            path.unlink()
    for name, data in files.items():
        path = output / name
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists() or path.read_bytes() != data:
            path.write_bytes(data)


def verify(files, output):
    expected = set(files)
    actual = {path.relative_to(output).as_posix() for path in output.rglob("*") if path.is_file()}
    errors = [f"意外文件: {name}" for name in actual - expected - LOCAL_DOCS]
    for name, data in files.items():
        path = output / name
        if not path.is_file() or path.read_bytes() != data:
            errors.append(f"生成结果不一致: {name}")
    if errors:
        raise ValueError("\n".join(errors))


def capture(manifest, output):
    if output.exists() and any(output.iterdir()):
        raise ValueError("抓取目录必须为空，避免覆盖已有快照")
    output.mkdir(parents=True, exist_ok=True)
    for entry in manifest["files"]:
        name = safe_path(entry["path"])
        target = output / name
        target.parent.mkdir(parents=True, exist_ok=True)
        if entry["kind"] == "author":
            url = entry["source_url"]
            with urlopen(url, timeout=30) as response:
                if urlsplit(response.url).hostname != urlsplit(manifest["origin"]).hostname:
                    raise ValueError(f"上游资源跳转到其他站点: {url}")
                target.write_bytes(response.read())
        else:
            shutil.copyfile(SNAPSHOT / name, target)
        print(name)


def import_snapshot(manifest, source, snapshot_date, web_version):
    if source.resolve() == SNAPSHOT.resolve():
        raise ValueError("请从独立的候选目录导入，不要原地修改快照")
    updated = dict(manifest, snapshot_date=snapshot_date, web_version=web_version)
    updated["files"] = [dict(entry, sha256=digest((source / safe_path(entry["path"])).read_bytes()))
                        for entry in manifest["files"]]
    # Validate all patch contexts before modifying either tracked tree.
    files = render(updated, source)
    with tempfile.TemporaryDirectory() as temp:
        staged = Path(temp)
        write_output(files, staged)
        verify(files, staged)
    previous = OUTPUT / "snapshot.json"
    old_paths = {entry["path"] for entry in read_json(previous)["files"] if "sha256" in entry} \
        if previous.exists() else set()
    for name in old_paths - {entry["path"] for entry in updated["files"]}:
        stale = SNAPSHOT / safe_path(name)
        if stale.is_file():
            stale.unlink()
    for entry in updated["files"]:
        target = SNAPSHOT / entry["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source / entry["path"], target)
    MANIFEST.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_output(files, OUTPUT)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("build")
    sub.add_parser("check")
    fetch = sub.add_parser("fetch")
    fetch.add_argument("--output", type=Path, required=True)
    diff = sub.add_parser("diff")
    diff.add_argument("--source", type=Path, required=True)
    promote = sub.add_parser("import")
    promote.add_argument("--source", type=Path, required=True)
    promote.add_argument("--snapshot-date", required=True)
    promote.add_argument("--web-version", type=int, required=True)
    args = parser.parse_args()
    manifest = read_json(MANIFEST)
    if args.command == "fetch":
        capture(manifest, args.output)
    elif args.command == "diff":
        known = {entry["path"] for entry in manifest["files"]}
        actual = {path.relative_to(args.source).as_posix()
                  for path in args.source.rglob("*") if path.is_file()}
        for name in sorted(actual - known):
            print("ADDED", name)
        for entry in manifest["files"]:
            candidate = args.source / safe_path(entry["path"])
            if not candidate.exists():
                print("MISSING", entry["path"])
            elif digest(candidate.read_bytes()) != entry["sha256"]:
                print("CHANGED", entry["path"])
    elif args.command == "import":
        import_snapshot(manifest, args.source, args.snapshot_date, args.web_version)
    else:
        files = render(manifest)
        if args.command == "build":
            write_output(files, OUTPUT)
        verify(files, OUTPUT)
        print(f"Verified {len(manifest['files'])} original files and {len(files)} generated files.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError) as error:
        raise SystemExit(str(error)) from error
