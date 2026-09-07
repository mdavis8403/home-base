# Family Board

Open **Family Board** from the family navigation. There is one small activity for the day: a question, a photo prompt, or a drawing challenge. The first visit starts that day's board. There is no need to visit every day.

Write your answer, choose one photo, or draw with the same tools as Messages. Add a few words to describe a photo or drawing, then choose **Tuck mine away**. Only you can see your response until the board opens. Submitted responses stay as they are, so preview yours before tucking it away.

The board opens when all three have responded, or at **8:00 PM in your family's timezone** by default. An open screen checks for the reveal every 10 seconds. You can also choose **Refresh board**. If the time has passed, someone can still add their response to today's open board. There are no scores or reminders about who hasn't joined in.

Drawing's optional timer starts when you tap **Start timer**. Uncheck it for all the time you want. Even when it rings, you can keep drawing.

Choose **Past Boards** to revisit previous days. Those answers, photos and drawings stay together as family memories.

## Parent choices

Mom or Dad can choose **Parent touches** inside Family Board. Confirm your own parent passcode, then:

- Set the reveal time. The family timezone is displayed beside it.
- Choose any mix of silly, imaginative, reflective, and family planning prompts. Keep at least one category selected.
- Add a custom question, photo prompt, or drawing challenge.

These choices begin with the next new board. Today's prompt and reveal time stay fixed. A new custom prompt gets a turn before unused built-in prompts, provided its category is enabled. Changing the family timezone itself is still part of future family settings.

## What needs connecting for live family use

If Messages already works on a live website with photos, Family Board uses that same hosting, private database, and private picture storage. The new database update (migration 003) must be applied before deploying this version. Do not re-create your family or re-run the initial family setup on an existing database.

If those services are not connected yet, the website still needs an HTTPS host, a private database, and private media storage. Questions work once the website and database are ready; photos and drawings also need private storage and the same image-inspection program used by Messages. No extra account, AI provider, or reveal scheduler is needed.

The technical setup steps are in README.md. Whoever connects the hosting should apply `npm run db:migrate` using the existing private database settings, deploy this version, and check one question, one photo, and one drawing with all three family profiles. Finish with a quick check on the actual iPad and phone. Automated browser tests use an isolated test family, not your real family data.

## Visual review

The `docs/reviews/family-board` folder contains full-page iPad, phone, and laptop screenshots of the question, private response, reveal, history, parent settings, photo preview, and drawing tools. Pictures in these screenshots are test fixtures, not family photos.
