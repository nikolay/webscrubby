#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(node -p "require('${root}/manifest.json').version")"
output_arg="${1:-${root}/dist/webscrubby-chrome-extension-${version}.zip}"
package_dir="${2:-}"

mkdir -p "$(dirname "${output_arg}")"
output_dir="$(cd "$(dirname "${output_arg}")" && pwd)"
output="${output_dir}/$(basename "${output_arg}")"

if [ -z "${package_dir}" ]; then
  package_dir="$(mktemp -d)"
  cleanup_package_dir=true
else
  cleanup_package_dir=false
  rm -rf "${package_dir}"
  mkdir -p "${package_dir}"
fi

cleanup() {
  if [ "${cleanup_package_dir}" = true ]; then
    rm -rf "${package_dir}"
  fi
}
trap cleanup EXIT

copy_file() {
  local source="$1"
  local target="${package_dir}/${source}"
  mkdir -p "$(dirname "${target}")"
  cp "${root}/${source}" "${target}"
}

copy_dir() {
  local source="$1"
  local target="${package_dir}/${source}"
  mkdir -p "${target}"
  cp -R "${root}/${source}/." "${target}/"
}

copy_file "manifest.json"
copy_file "background.js"
copy_file "content.js"
copy_file "offscreen.html"
copy_file "offscreen.js"
copy_file "rules/query-params.json"
copy_file "src/scrubber.js"
copy_file "assets/webscrubby-logo.svg"
copy_dir "assets/icons"

node -e "const fs = require('fs'); const path = '${package_dir}/manifest.json'; const manifest = JSON.parse(fs.readFileSync(path, 'utf8')); delete manifest.key; fs.writeFileSync(path, JSON.stringify(manifest, null, 2) + '\n');"

rm -f "${output}"
(
  cd "${package_dir}"
  zip -qr "${output}" . -x "*.DS_Store" "__MACOSX/*"
)

echo "Packaged ${output}"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "package_path=${output}" >> "${GITHUB_OUTPUT}"
  echo "package_name=$(basename "${output}")" >> "${GITHUB_OUTPUT}"
fi

