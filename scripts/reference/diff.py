#!/usr/bin/env python3
"""Compare the independent Python reference with the TypeScript implementation."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from p12_reference import build_reference, load_dataset


ROOT = Path(__file__).resolve().parents[2]


def typescript_report(case_id: str) -> dict[str, Any]:
    result = subprocess.run(
        ["npx", "tsx", "scripts/verify.ts", case_id],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout)


def compare(reference: Any, actual: Any, path: str, disagreements: list[str]) -> None:
    if isinstance(reference, dict):
        if not isinstance(actual, dict):
            disagreements.append(f"{path}: reference={reference!r} actual={actual!r}")
            return
        for key, expected in reference.items():
            child_path = f"{path}.{key}" if path else key
            if key not in actual:
                disagreements.append(f"{child_path}: missing from TypeScript output")
            else:
                compare(expected, actual[key], child_path, disagreements)
        return
    if isinstance(reference, list):
        if not isinstance(actual, list) or len(reference) != len(actual):
            actual_length = len(actual) if isinstance(actual, list) else "not-a-list"
            disagreements.append(
                f"{path}.length: reference={len(reference)} actual={actual_length}"
            )
            return
        for index, expected in enumerate(reference):
            compare(expected, actual[index], f"{path}[{index}]", disagreements)
        return
    if reference != actual:
        disagreements.append(f"{path}: reference={reference!r} actual={actual!r}")


def main() -> None:
    dataset = load_dataset()
    requested = set(sys.argv[1:])
    cases = [
        case for case in dataset["cases"] if not requested or case["case_id"] in requested
    ]
    if requested and len(cases) != len(requested):
        found = {case["case_id"] for case in cases}
        raise SystemExit(f"Unknown case(s): {', '.join(sorted(requested - found))}")

    total = 0
    for case in cases:
        case_id = case["case_id"]
        disagreements: list[str] = []
        compare(build_reference(case), typescript_report(case_id), "", disagreements)
        if disagreements:
            for disagreement in disagreements:
                print(f"{case_id} {disagreement}")
            total += len(disagreements)

    if total:
        print(f"DIFF — {total} disagreement(s) across {len(cases)} case(s)")
        raise SystemExit(1)
    print(f"OK — {len(cases)} cases agree on all independently specified fields")


if __name__ == "__main__":
    main()
