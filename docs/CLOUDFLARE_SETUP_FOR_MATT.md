# Put Home Base on MDhomebase.com

These are the Cloudflare dashboard steps you need to do. There are no Terminal commands to run. The repository creates the database tables and connects the private media bucket automatically. We have not deployed anything or changed your DNS during the migration.

Use the Cloudflare account that owns **MDhomebase.com**. The address will be **https://mdhomebase.com** (without `www`). Capitalization does not matter in a domain name.

## 1. Enable Workers and R2

1. Sign in to [Cloudflare](https://dash.cloudflare.com).
2. Open **Workers & Pages**. Use the **Workers Paid** plan for this app; its media/password processing needs the higher CPU limit. Review the current price shown by Cloudflare before accepting.
3. Open **Storage & databases → R2 object storage**. If Cloudflare asks you to activate R2 and add billing details, complete that step. You do not need to create a bucket manually.

No AI service, external database account, S3 access keys, or Durable Object setup is needed.

## 2. Connect the GitHub project

1. Go to **Workers & Pages → Create application → Import a repository** (the GitHub option may be called **Connect to Git**).
2. Authorize GitHub access to **mdavis8403/home-base** and select that repository.
3. Use Worker/project name **home-base**, branch **main**, and the repository root directory (leave the root field empty if offered).
4. Set **Build command** to `npm run build:cloudflare`.
5. Set **Deploy command** to `npm run deploy`.
6. Under the build's API token option, let Cloudflare create a token. Open your profile menu in another tab: **My Profile → API Tokens**. Edit that newly created Workers Builds token and add **Account → D1 → Edit** for this account. Keep its existing Workers and R2 permissions. The standard generated token does not include D1 permission, which Home Base needs to create and migrate its database. Return to the build setup and keep that token selected. If Cloudflare only creates the token when the first build starts, let that build start, add D1 permission as soon as the token appears, then retry the build if needed.
7. Choose **Deploy**. This is the deliberate first cloud deployment. It creates the Worker, **home-base-db**, and **home-base-private-media**, then creates the tables. The Worker remains without a public address until step 4 below. If a build already started before you added D1 permission, use **Builds → Retry build** afterward.
8. In the Worker's **Settings → Builds**, keep **main** as the production branch and disable non-production branch deployments. Test branches must not share the family database. Future pushes to `main` will deploy automatically once this connection is enabled.

Do not select Cloudflare Pages or change the build to a static export. The project contains the required Workers configuration already.

## 3. Add the private family setup values

1. Open **Workers & Pages → home-base → Settings → Variables and Secrets → Add**.
2. Choose type **Secret**, name **FAMILY_ACCESS_PHRASE**, and enter the family magic word you already chose. Do not put it in a build command, GitHub file, or a public variable.
3. Add another **Secret** named **ADMIN_ACCESS_KEY**. Choose a different phrase of at least 12 characters and keep it in the adults' password manager. It protects sensitive parent settings only; Mom, Dad and Mia still have no individual PINs. You can omit this key if you want sensitive settings to stay locked.
4. Save/apply the secrets (Cloudflare may label this **Deploy**). The ordinary values **APP_ORIGIN = https://mdhomebase.com** and **FAMILY_TIMEZONE = America/Chicago** already come from the repository.
5. Open the Worker's **Bindings** and confirm **DB** points to **home-base-db**, and **FAMILY_MEDIA** points to **home-base-private-media**. They should already be connected automatically.
6. Open **R2 → home-base-private-media → Settings**. Leave **Public development URL** disabled and **Custom domains** empty. Private media is served through the Home Base app; never make this bucket public.

## 4. Deliberately connect your domain

This step makes Home Base reachable on your real domain and changes its routing. Do it when you are ready to go live.

1. Open **Workers & Pages → home-base → Settings → Domains & Routes → Add → Custom Domain**.
2. Enter **mdhomebase.com** and choose **Add Custom Domain**. Cloudflare manages the DNS connection and HTTPS certificate.
3. Wait for the domain/certificate to show as active. If Cloudflare reports an existing conflicting DNS record, stop and ask Codex to review it rather than deleting an unrelated record.
4. Keep **workers.dev** and **preview URLs** disabled. Use the exact `https://mdhomebase.com` address for sign-in.

## 5. Finish first entry and remove setup secrets

Open **https://mdhomebase.com**, tap the cottage door, enter the magic word, and choose your profile. That first setup creates the three profiles and stores protected hashes. After successful entry, return to **home-base → Settings → Variables and Secrets** and delete **FAMILY_ACCESS_PHRASE** and **ADMIN_ACCESS_KEY**, then save/apply. Normal entry and parent verification continue using the stored hashes. Keep your own private copy of the words.

Changing a setup secret later does not overwrite an existing family's credentials. If you forget either word, ask Codex to help recover access without recreating the database or losing memories.

The first live check should include a photo or recording, a scheduled note, a Board response and a Mystery Club game with all three devices. On iPad, use Safari's **Share → Add to Home Screen** once the HTTPS site works. Those are family acceptance checks, not infrastructure setup.

## If the dashboard reports a problem

- **D1 permission denied:** edit the build API token's **Account → D1 → Edit** permission and retry the build.
- **R2 not enabled:** finish R2 activation/billing and retry; do not enable public access.
- **Worker name mismatch:** both the dashboard project and the repository name must be **home-base**.
- **Magic word won't open the door on the first deployment:** confirm the runtime Secret is set, the build/migration succeeded, and you are using the exact HTTPS domain. Do not rerun setup by deleting the database.

Send Codex the error wording, without passwords or API tokens. The code is tested locally in Cloudflare's runtime; account-specific provisioning, billing and DNS can only be confirmed during this first real deployment.

Dashboard references checked September 8, 2026: [Workers Builds settings and token permissions](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [automatic D1/R2 provisioning](https://developers.cloudflare.com/changelog/post/2025-10-24-automatic-resource-provisioning/), [custom domain steps](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
