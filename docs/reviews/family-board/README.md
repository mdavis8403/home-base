# Family Board visual review

These screenshots use an isolated test family on the production build. They contain no real family responses or photos.

| Screen             | iPad                              | Phone                              | Laptop                              |
| ------------------ | --------------------------------- | ---------------------------------- | ----------------------------------- |
| Today's question   | [View](ipad-question.png)         | [View](phone-question.png)         | [View](laptop-question.png)         |
| Private response   | [View](ipad-private-response.png) | [View](phone-private-response.png) | [View](laptop-private-response.png) |
| All three revealed | [View](ipad-revealed.png)         | [View](phone-revealed.png)         | [View](laptop-revealed.png)         |
| Past Boards        | [View](ipad-history.png)          | [View](phone-history.png)          | [View](laptop-history.png)          |
| Parent controls    | [View](ipad-parent-settings.png)  | [View](phone-parent-settings.png)  | [View](laptop-parent-settings.png)  |
| Photo preview      | [View](ipad-photo-preview.png)    | [View](phone-photo-preview.png)    | [View](laptop-photo-preview.png)    |
| Drawing tools      | [View](ipad-drawing.png)          | [View](phone-drawing.png)          | [View](laptop-drawing.png)          |

The test clock changes reveal deadlines to exercise both early and timed reveals; the product default is still 8:00 PM in the family timezone. Photo-preview screenshots show the honest storage-not-connected message from the test environment. Actual image inspection, private uploads, signing authorization, duplicate cleanup, and media archives are covered separately by service/database integration tests using a fake storage adapter. Live private-bucket round trips remain a hosting acceptance check.

## Verification completed

- 46 unit/database integration tests passed.
- Type checking, linting, and the production build passed.
- 31 production browser tests passed across laptop Chromium and iPad/phone WebKit.
- Two existing WebKit offline-shell tests remain intentionally skipped; Chromium tests the offline cache.
- Reviewed iPad and phone layouts, private/revealed responses, archive, parent controls, and shared drawing tools. Browser tests also check for horizontal overflow.
