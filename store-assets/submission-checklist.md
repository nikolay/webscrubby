# Chrome Web Store Submission Checklist

1. Run `bash scripts/package-extension.sh` and upload the generated ZIP for the first Chrome Web Store item.
2. Use the listing copy in `store-assets/listing.md`.
3. Use `https://webscrubby.com/privacy.html` as the privacy policy URL.
4. Fill in the permission justifications from `store-assets/listing.md`.
5. WebScrubby Chrome Web Store item ID: `ebomfpkjnagghkpipgcghjamnpoiekne`.
6. Use `store-assets/webscrubby-screenshot-1280x800.png` or `.jpg` as the required store screenshot.
7. After the first item exists, add these repository secrets:
   - `CWS_EXTENSION_ID=ebomfpkjnagghkpipgcghjamnpoiekne`
   - `CWS_PUBLISHER_ID`
   - `CWS_SERVICE_ACCOUNT_JSON`
   - `CWS_CRX_PRIVATE_KEY` only if Verified CRX uploads are enabled
8. Run the `Tag Extension Release` workflow with `confirm_publish` checked to create `extension-v<manifest version>`.
9. Confirm the GitHub release package and Chrome Web Store workflow run.
