import { useState } from 'react';
import styles from "./Footer.module.css";
import sage from "../../assets/images/logo_sage.png";
import sabersaude from "../../assets/images/logo_sabersaude.png";
import partnerhotels from "../../assets/images/logo_partnerhotel.png";
import competir from "../../assets/images/logo_competir.png";
import logoBeam from "../../assets/images/logo_beam_footer.png";
import appStore from "../../assets/logo_app_store_footer.png";
import googlePlay from "../../assets/logo_google_play_footer.png";
import { Link } from "react-router-dom";

// Import images using URL constructor for better path resolution
const dmcaImage = new URL('../../assets/images/dmca.png', import.meta.url).href;
const seal65Image = new URL('../../assets/images/seal_65.png', import.meta.url).href;

const Footer = () => {
  const [email, setEmail] = useState<string>("");
  const [_, setShowSuccess] = useState<boolean>(false);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (email.trim()) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/api/newsletter/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });
        
        if (response.ok) {
          setShowSuccess(true);
          setEmail("");
          
          setTimeout(() => {
            setShowSuccess(false);
          }, 3000);
        } else {
          console.log("Newsletter subscription failed");
        }
      } catch (error) {
        console.log("Newsletter subscription error:", error);
      }
    }
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.newsletterSection}>
        <div className={styles.container}>
          <h2 className={styles.newsletterTitle}>Newsletter</h2>
          <form className={styles.newsletterForm} onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={handleEmailChange}
              className={styles.emailInput}
              required
            />
            <button type="submit" className={styles.subscribeButton}>
              Subscribe
            </button>
          </form>
        </div>
        <div className={styles.partners}>
          <img src={sage} alt="Sage" />
          <img src={competir} alt="Competir" />
          <img src={partnerhotels} alt="Partner Hotels" />
          <img src={sabersaude} alt="Saber Saude" />
        </div>
        <hr className={styles.hr} />
      </div>

      <div className={styles.footerContent}>
        <div className={styles.footerContainer}>
          <div className={styles.footerColumn}>
            <div className={styles.logoSection}>
              <img src={logoBeam} alt="Beam Logo" className={styles.footerLogo} />
              <div className={styles.description}>
                <p>
                  BEAM is a marketing platform and digital wallet that processes
                  electronic payments.
                </p>
                <p>
                  It operates from smartphones of Consumers/Users who download
                  this application, giving them immediate benefits with every
                  purchase.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>Quick Link</h3>
            <ul className={styles.footerLinks}>
              <li>
                <a
                  href="https://www.blog.beamwallet.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Blog
                </a>
              </li>
              <li>
                <Link to="/help-center">Help Center</Link>
              </li>
              <li>
                <Link to="/terms-and-conditions">Terms and Conditions</Link>
              </li>
              <li>
                <Link to="/privacy-policy">Privacy Policy</Link>
              </li>
              <li>
                <Link to="/contacts">Contacts</Link>
              </li>
            </ul>
          </div>

          <div className={styles.footerColumn}>
            <h3 className={styles.columnTitle}>Download BEAM</h3>
            <div className={styles.downloadButtons}>
              <a
                href="https://apps.apple.com/us/app/beam-wallet/id1446974079"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={appStore}
                  alt="Download on the App Store"
                  className={styles.downloadButton}
                />
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.beamwallet"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src={googlePlay}
                  alt="Get it on Google Play"
                  className={styles.downloadButton}
                />
              </a>
            </div>
          </div>
        </div>

        <hr className={styles.hr} />

        <div className={styles.bottomFooter}>
          <div className={styles.socialContainer}>
            <div className={styles.socialIcons}>
              <a
                href="https://www.instagram.com/beamwallet/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
              >
                <i className="fa-brands fa-instagram"></i>
              </a>
              <a
                href="https://www.facebook.com/thebeamwallet/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
              >
                <i className="fa-brands fa-facebook-f"></i>
              </a>
              <a
                href="https://x.com/beamwallet"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
              >
                <i className="fa-brands fa-x-twitter"></i>
              </a>
              <a
                href="https://www.linkedin.com/company/beam-wallet/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
              >
                <i className="fa-brands fa-linkedin-in"></i>
              </a>
              <a
                href="https://www.youtube.com/@beamwallet"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
              >
                <i className="fa-brands fa-youtube"></i>
              </a>
              <a
                href="https://medium.com/beam-wallet"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
              >
                <i className="fa-brands fa-medium"></i>
              </a>
              <a
                href="https://t.me/s/beamwalletgbc"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
              >
                <i className="fa-brands fa-telegram"></i>
              </a>
              <a
                href="https://www.tiktok.com/@beamwallet"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
              >
                <i className="fa-brands fa-tiktok"></i>
              </a>
              <a
                href="https://pt.pinterest.com/06e88r16nl83mr975pe7zlnr4qtu6o/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialIcon}
              >
                <i className="fa-brands fa-pinterest-p"></i>
              </a>
            </div>

            <div className={styles.legalText}>
              <p>
                BEAM is a registered trademark of <a>GBC S.A.</a>
              </p>
              <p>Copyright ©{new Date().getFullYear()} | All rights reserved</p>
            </div>

            {/* Add certification badges */}
            <div className={styles.certifications}>
              <a 
                href="https://www.dmca.com/Protection/Status.aspx?id=fc54b3fe-07dd-49a0-9252-696567770cd1&refurl=https%3a%2f%2fbeamwallet.com%2f&rlo=true" 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.certLink}
              >
                <img src={dmcaImage} alt="DMCA Protected" className={styles.certBadge} />
              </a>
              <a 
                href="https://my-pci.usd.de/compliance/2909-2A2C-E055-8FEA-A952-A7AC/details_en.html" 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.certLink}
              >
                <img src={seal65Image} alt="Seal 65" className={styles.certBadge} />
              </a>
            </div>

          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
