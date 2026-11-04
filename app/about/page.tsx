import { LineBadge, RouteSample } from '@/components/icons';
import { MODES } from '@/lib/types';

export const metadata = { title: 'How it works · Peregrine' };

export default function About() {
  return (
    <div className="page">
      <h1>How it works</h1>
      <div className="prose">
        <p>
          Peregrine starts from where you are and looks at about three hundred places worth a trip, plus anything that turns up in live
          flight fares. For each one it works out every way to get there and back on the dates you can travel, drops what breaks your
          rules (budget, journey length, changes, hours there), then ranks the rest by the things you said matter.
        </p>
      </div>

      <section>
        <h2>Real prices and estimates</h2>
        <div className="prose">
          <p>
            Every price carries a stamp. <span className="stamp live">live</span> is a real fare fetched for your dates.{' '}
            <span className="stamp est">est.</span> is a model built from distance, region and how far ahead you book, with links to
            where the real price lives. Stay and spending costs are always estimates.
          </p>
        </div>
        <table className="ledger" style={{ maxWidth: 820 }}>
          <thead><tr><th>Mode</th><th>Prices</th><th>Source</th></tr></thead>
          <tbody>
            <tr><td><LineBadge mode="flight" /></td><td>Real where Ryanair or Google has a fare; otherwise estimated from typical budget fares for the distance, with the airlines to check</td><td>Ryanair fare finder (free); Google Flights through SerpApi’s free plan</td></tr>
            <tr><td><LineBadge mode="bus" /></td><td>Real for the leading results and on demand; estimated otherwise</td><td>FlixBus (free)</td></tr>
            <tr><td><LineBadge mode="train" /></td><td>Estimated; real timetables on demand</td><td>Timetables from Transitous; book through Omio, Trainline or Rome2rio</td></tr>
            <tr><td><LineBadge mode="ferry" /></td><td>Estimated</td><td>Check Ferryhopper or Direct Ferries</td></tr>
            <tr><td><LineBadge mode="rideshare" /></td><td>Estimated</td><td>Check BlaBlaCar</td></tr>
            <tr><td><LineBadge mode="drive" /></td><td>Estimated fuel and tolls, split between travellers</td><td>Google Maps route</td></tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Reading the chart</h2>
        <div className="prose">
          <p>The map is drawn in a Lambert conformal projection, the one used on aeronautical charts. Each route takes the line style of its best way there:</p>
        </div>
        <div className="card-list" style={{ maxWidth: 420 }}>
          {MODES.map((m) => (
            <div key={m} className="row" data-mode={m}><RouteSample mode={m} className="route" /> <LineBadge mode={m} /></div>
          ))}
        </div>
      </section>

      <section>
        <h2>Privacy</h2>
        <div className="prose">
          <p>There are no accounts. Your settings, saved trips, wishlist and “been there” list stay in this browser.</p>
        </div>
      </section>

      <section>
        <h2>Credits</h2>
        <div className="prose">
          <p>
            Timetables: <a href="https://transitous.org/sources/">Transitous</a> and its open data sources. Airports:{' '}
            <a href="https://ourairports.com/data/">OurAirports</a> (public domain). Map: Natural Earth via world-atlas. Town search:
            Open-Meteo geocoding. Fares: Ryanair, FlixBus, Google Flights via SerpApi.
          </p>
        </div>
      </section>
    </div>
  );
}
