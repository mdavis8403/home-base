# Family Board

Open **Family Board** from the family navigation. There is one small activity for the day: a question, a photo prompt, or a drawing challenge. The first visit starts that day's board. There is no need to visit every day.

Write your answer, choose one photo, or draw with the same tools as Messages. Add a few words to describe a photo or drawing, then choose **Tuck mine away**. Only you can see your response until the board opens. Submitted responses stay as they are, so preview yours before tucking it away.

The board opens when all three have responded, or at **8:00 PM in your family's timezone** by default. An open screen checks for the reveal every 10 seconds. You can also choose **Refresh board**. If the time has passed, someone can still add their response to today's open board. There are no scores or reminders about who hasn't joined in.

Drawing's optional timer starts when you tap **Start timer**. Uncheck it for all the time you want. Even when it rings, you can keep drawing.

Choose **Past Boards** to revisit previous days. Those answers, photos and drawings stay together as family memories.

## Parent choices

Mom or Dad can choose **Parent touches** inside Family Board. Confirm the separate administration key, then:

- Set the reveal time. The family timezone is displayed beside it.
- Choose any mix of silly, imaginative, reflective, and family planning prompts. Keep at least one category selected.
- Add a custom question, photo prompt, or drawing challenge.

These choices begin with the next new board. Today's prompt and reveal time stay fixed. A new custom prompt gets a turn before unused built-in prompts, provided its category is enabled. Changing the family timezone itself is still part of future family settings.

## Cloudflare family setup

See [Cloudflare setup for Matt](CLOUDFLARE_SETUP_FOR_MATT.md). Workers hosts the app, D1 saves family content and game progress, and private R2 stores family media. The deployment process applies the fresh D1 migrations automatically. The historical PostgreSQL migrations are not part of this deployment.

Local tests use Cloudflare's isolated D1/R2 simulator and the production Workers build. The first live deployment still needs account setup and a family trial on the real iPad, phone and laptop. No extra AI or realtime account is needed.

## Visual review

The `docs/reviews/family-board` folder contains full-page iPad, phone, and laptop screenshots of the question, private response, reveal, history, parent settings, photo preview, and drawing tools. Pictures in these screenshots are test fixtures, not family photos.
