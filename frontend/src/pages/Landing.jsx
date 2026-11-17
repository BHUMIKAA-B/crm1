import React from "react";

const flatsNorth = [
  "Flats for Sale in Airport City",
  "Flats for Sale in Bagaluru",
  "Flats for Sale in Banashankari",
  "Flats for Sale in Banaswadi",
  "Flats for Sale in Hebbal",
  "Flats for Sale in Hennur",
  "Flats for Sale in Hesaraghatta",
  "Flats for Sale in Horamavu",
  "Flats for Sale in Jakkur",
  "Flats for Sale in Kalkere",
  "Flats for Sale in Kengeri",
  "Flats for Sale in Kiald Park",
  "Flats for Sale in Kyalasanahalli",
  "Flats for Sale in Mandur"
];

const flatsSouth = [
  "Flats for Sale in Akshayanagar",
  "Flats for Sale in Anekal",
  "Flats for Sale in Anjanapura",
  "Flats for Sale in Attibele",
  "Flats for Sale in Banashankari 6th Stage",
  "Flats for Sale in Basavanagudi",
  "Flats for Sale in Begur",
  "Flats for Sale in Bilekahalli",
  "Flats for Sale in Bommasandra",
  "Flats for Sale in BTM Layout",
  "Flats for Sale in Electronic City",
  "Flats for Sale in Gopasandra",
  "Flats for Sale in JP Nagar",
  "Flats for Sale in Kaggipura",
  "Flats for Sale in Kanakapura Road",
  "Flats for Sale in Uttarahalli"
];

const reviews = [
  { quote: '"weeks — and paid zero brokerage. The team handled everything."', name: "Arjun Mehra", location: "Buyer, Bangalore" },
  { quote: '"Property was live in 3 days, sold in 6 weeks."', name: "Kavya Iyer", location: "Seller, Hyderabad" },
  { quote: '"VisitSarva calling me back, not a broker chasing commission."', name: "Rohit Bhandari", location: "Buyer, Pune" },
];

const landingStyles = `
  .visit-lp-shell {
    min-height: 100vh;
    background: #f3dce4;
    padding: 18px 12px 24px;
    font-family: "Inter", "Segoe UI", sans-serif;
  }

  .visit-lp-window {
    max-width: 1440px;
    margin: 0 auto;
    background: #f5f5f2;
    border: 6px solid #f5c4d3;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: 0 18px 40px rgba(66, 44, 49, 0.08);
  }

  .visit-lp-browser {
    display: flex;
    align-items: center;
    gap: 16px;
    background: #f5d5de;
    padding: 14px 18px;
    border-bottom: 1px solid rgba(61, 46, 56, 0.08);
  }

  .visit-lp-browser-dots {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .visit-lp-browser-dots span {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: block;
    background: #f0b8b7;
  }

  .visit-lp-address {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .visit-lp-address-box {
    width: min(48vw, 560px);
    padding: 10px 16px;
    border-radius: 9999px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    background: rgba(255, 255, 255, 0.2);
    color: rgba(25, 30, 38, 0.8);
    font-size: 13px;
    text-align: center;
  }

  .visit-lp-topbar {
    background: #1d232b;
    color: #e5ebf0;
    padding: 18px 26px 0;
  }

  .visit-lp-topbar-row {
    display: flex;
    gap: 22px;
    justify-content: space-between;
    font-size: 15px;
    color: rgba(229, 235, 240, 0.8);
    padding-bottom: 18px;
  }

  .visit-lp-topbar-row .left,
  .visit-lp-topbar-row .right {
    display: flex;
    gap: 26px;
    align-items: center;
    flex-wrap: wrap;
  }

  .visit-lp-topbar-row .left .active {
    color: #f9fafb;
    font-weight: 600;
  }

  .visit-lp-quick-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 38px;
    padding: 8px 14px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: #f9fafb;
    font-weight: 600;
    text-decoration: none;
    transition: background-color 150ms ease, border-color 150ms ease;
  }

  .visit-lp-quick-link:hover,
  .visit-lp-quick-link:focus-visible {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.65);
  }

  .visit-lp-tabs {
    display: grid;
    grid-template-columns: repeat(4, minmax(120px, 1fr));
    gap: 18px;
    padding-top: 20px;
    padding-bottom: 16px;
    border-top: 1px solid rgba(255,255,255,0.08);
  }

  .visit-lp-tab {
    font-size: 23px;
    line-height: 1.2;
    color: rgba(234, 236, 239, 0.9);
    font-weight: 500;
    letter-spacing: -0.03em;
    padding-bottom: 6px;
  }

  .visit-lp-tab.active {
    color: #f4f8ff;
    font-weight: 700;
  }

  .visit-lp-tab.active::after {
    content: "";
    display: block;
    width: 74px;
    height: 3px;
    background: #75e6df;
    margin-top: 12px;
    border-radius: 999px;
  }

  .visit-lp-listings {
    background: #f0f0ee;
    padding: 28px 28px 20px;
  }

  .visit-lp-list-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 48px 52px;
  }

  .visit-lp-list-box h3 {
    font-size: 21px;
    font-weight: 600;
    color: #232d38;
    margin-bottom: 20px;
    letter-spacing: -0.03em;
  }

  .visit-lp-list-box ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 14px;
  }

  .visit-lp-list-box li {
    font-size: 16px;
    line-height: 1.5;
    color: #303b47;
  }

  .visit-lp-see-more {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid rgba(60, 66, 72, 0.16);
    margin-top: 32px;
    padding-top: 18px;
  }

  .visit-lp-see-more button {
    font-size: 22px;
    font-weight: 600;
    color: #202a34;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .visit-lp-see-more span {
    width: 88px;
    border-top: 2px solid rgba(40, 44, 49, 0.8);
  }

  .visit-lp-testimonials {
    background: #e8e7e3;
    padding: 28px 24px 30px;
  }

  .visit-lp-testimonials-wrap {
    max-width: 1200px;
    margin: 0 auto;
    border-radius: 28px;
    background: rgba(252, 250, 247, 0.8);
    padding: 16px;
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
  }

  .visit-lp-testimonials-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .visit-lp-card {
    padding: 22px 20px 18px;
    background: rgba(244, 244, 242, 0.9);
    border: 1px solid rgba(138, 146, 152, 0.25);
    border-radius: 18px;
    min-height: 180px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .visit-lp-card blockquote {
    margin: 0;
    font-size: 17px;
    line-height: 1.6;
    letter-spacing: -0.02em;
    color: #242b34;
  }

  .visit-lp-card-footer {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid rgba(86, 92, 100, 0.28);
    color: #3e4651;
    font-size: 14px;
  }

  .visit-lp-card-footer strong {
    display: block;
    color: #1d242c;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .visit-lp-footer {
    background: #f0f1ef;
    padding: 28px 24px 18px;
  }

  .visit-lp-footer-inner {
    max-width: 1200px;
    margin: 0 auto;
    border-top: 1px solid rgba(66, 72, 81, 0.14);
    padding-top: 28px;
  }

  .visit-lp-footer-grid {
    display: grid;
    grid-template-columns: 1.6fr 1fr 1fr 1fr;
    gap: 28px;
  }

  .visit-lp-brand {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }

  .visit-lp-brand-mark {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #efe2ce;
    color: #bf9857;
    border: 1px solid rgba(191, 152, 87, 0.4);
    font-size: 22px;
    font-weight: 700;
  }

  .visit-lp-brand-text {
    font-size: 22px;
    font-weight: 500;
    color: #242a31;
  }

  .visit-lp-brand-sub {
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-size: 10px;
    color: #687583;
  }

  .visit-lp-footer-copy {
    max-width: 330px;
    font-size: 17px;
    line-height: 1.7;
    color: #536172;
  }

  .visit-lp-socials {
    display: flex;
    gap: 12px;
    margin-top: 18px;
  }

  .visit-lp-socials button {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: 1px solid rgba(88, 98, 110, 0.2);
    background: rgba(255,255,255,0.7);
    color: #47586d;
    font-size: 18px;
  }

  .visit-lp-tagline {
    margin-top: 18px;
    font-size: 17px;
    font-style: italic;
    color: #7a95ad;
  }

  .visit-lp-footer-column h4 {
    margin: 0 0 18px;
    font-size: 11px;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: #6e7f8d;
  }

  .visit-lp-footer-column ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 12px;
    color: #2d3743;
    font-size: 17px;
  }

  .visit-lp-footer-bottom {
    margin-top: 22px;
    border-top: 1px solid rgba(66, 72, 81, 0.14);
    padding-top: 18px;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 16px;
    color: #667586;
    font-size: 15px;
  }

  @media (max-width: 980px) {
    .visit-lp-topbar-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .visit-lp-tabs {
      grid-template-columns: repeat(2, minmax(140px, 1fr));
    }

    .visit-lp-list-grid,
    .visit-lp-testimonials-grid,
    .visit-lp-footer-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .visit-lp-shell {
      padding-left: 8px;
      padding-right: 8px;
    }

    .visit-lp-browser {
      padding-left: 10px;
      padding-right: 10px;
    }

    .visit-lp-address-box {
      width: 100%;
    }

    .visit-lp-topbar {
      padding-left: 14px;
      padding-right: 14px;
    }

    .visit-lp-tabs {
      grid-template-columns: 1fr;
    }

    .visit-lp-tab {
      font-size: 19px;
    }
  }
`;

const Landing = () => {
  return (
    <div className="visit-lp-shell">
      <style>{landingStyles}</style>

      <div className="visit-lp-window">
        <div className="visit-lp-browser">
          <div className="visit-lp-browser-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="visit-lp-address">
            <div className="visit-lp-address-box">https://www.visitsarva.com</div>
          </div>
        </div>

        <header className="visit-lp-topbar">
          <div className="visit-lp-topbar-row">
            <div className="left">
              <span className="active">All Properties</span>
            </div>
            <div className="right">
              <span>Upcoming Project</span>
              <span>Developer Project</span>
              <span>Resale</span>
              <a
                className="visit-lp-quick-link"
                href="https://visitsarva.com/blogs"
                data-testid="blogs-button"
              >
                Blogs
              </a>
              <a
                className="visit-lp-quick-link"
                href="https://visitsarva.com/saved"
                data-testid="wishlist-button"
              >
                Wishlist
              </a>
            </div>
          </div>

          <div className="visit-lp-tabs">
            <div className="visit-lp-tab active">Flats</div>
            <div className="visit-lp-tab">Plots</div>
            <div className="visit-lp-tab">Villas</div>
            <div className="visit-lp-tab">Builder Group</div>
          </div>
        </header>

        <main className="visit-lp-listings">
          <div className="visit-lp-list-grid">
            <div className="visit-lp-list-box">
              <h3>Flats in North Bangalore</h3>
              <ul>
                {flatsNorth.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div className="visit-lp-list-box">
              <h3>Flats in South Bangalore</h3>
              <ul>
                {flatsSouth.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>

          <div className="visit-lp-see-more">
            <button type="button">See More</button>
            <span />
          </div>
        </main>

        <section className="visit-lp-testimonials">
          <div className="visit-lp-testimonials-wrap">
            <div className="visit-lp-testimonials-grid">
              {reviews.map((review) => (
                <article key={review.name} className="visit-lp-card">
                  <blockquote>{review.quote}</blockquote>
                  <div className="visit-lp-card-footer">
                    <strong>{review.name}</strong>
                    <span>{review.location}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <footer className="visit-lp-footer">
          <div className="visit-lp-footer-inner">
            <div className="visit-lp-footer-grid">
              <div>
                <div className="visit-lp-brand">
                  <div className="visit-lp-brand-mark">V</div>
                  <div>
                    <div className="visit-lp-brand-text">VisitSarva</div>
                    <div className="visit-lp-brand-sub">Zero Brokerage Property Platform</div>
                  </div>
                </div>

                <p className="visit-lp-footer-copy">
                  VisitSarva connects buyers directly with verified sellers across India — no brokers, no hidden fees, no middlemen.
                </p>

                <div className="visit-lp-socials">
                  <button type="button">◌</button>
                  <button type="button">◍</button>
                  <button type="button">◐</button>
                  <button type="button">◔</button>
                </div>

                <div className="visit-lp-tagline">"Buy property, pay no brokerage."</div>
              </div>

              <div className="visit-lp-footer-column">
                <h4>Explore</h4>
                <ul>
                  <li>All Properties</li>
                  <li>Residential</li>
                  <li>Commercial</li>
                  <li>Home Loan Assistance</li>
                  <li>Document Services</li>
                </ul>
              </div>

              <div className="visit-lp-footer-column">
                <h4>For You</h4>
                <ul>
                  <li>Sign Up</li>
                  <li>Login</li>
                  <li>List Property</li>
                  <li>Request Service</li>
                </ul>
              </div>

              <div className="visit-lp-footer-column">
                <h4>Company</h4>
                <ul>
                  <li>About Us</li>
                  <li>Contact</li>
                  <li>Privacy Policy</li>
                  <li>Terms of Service</li>
                </ul>
              </div>
            </div>

            <div className="visit-lp-footer-bottom">
              <div>© 2026 VisitSarva. All rights reserved.</div>
              <div>India · Zero Brokerage Platform · Employee Access</div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
