import Link from "next/link";
import { requireSession } from "@/lib/server/auth";
import { destinations } from "@/lib/shared/navigation";
import { Clubhouse } from "@/components/clubhouse";
export const metadata = { title: "Our place" };
export default async function Home() {
  const { profile } = await requireSession();
  return (
    <>
      <section className="welcome">
        <div>
          <p className="eyebrow">A LITTLE CLOSER, WHEREVER WE ARE</p>
          <h1>
            Welcome home,
            <br />
            <em>{profile.displayName}.</em>
          </h1>
          <p>
            Your family’s place is taking shape.
            <br />
            There’s room here for all the good things to come.
          </p>
        </div>
        <Clubhouse small />
      </section>
      <section className="rooms-section" aria-labelledby="rooms-title">
        <div className="section-heading">
          <h2 id="rooms-title">Make yourself at home</h2>
          <span className="phase-label">The beginning of something good</span>
        </div>
        <div className="rooms">
          {destinations.map((d) => (
            <Link className={`room ${d.color}`} key={d.href} href={d.href}>
              <span className="room-icon" aria-hidden="true">
                {d.symbol}
              </span>
              <h3>{d.label}</h3>
              <p>{d.description}</p>
              <span className="room-bottom">
                Coming in a future chapter <span aria-hidden="true">↗</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <aside className="family-note">
        <span aria-hidden="true">✧</span>
        <p>
          Our favorite place isn’t a place.
          <br />
          <strong>It’s being together.</strong>
        </p>
      </aside>
    </>
  );
}
