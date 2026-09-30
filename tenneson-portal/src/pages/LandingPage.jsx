import {
  FaArrowRight,
  FaBookOpen,
  FaClock,
  FaFacebook,
  FaGraduationCap,
  FaInstagram,
  FaMapMarkerAlt,
  FaPhone,
  FaSchool,
  FaTwitter,
  FaWhatsapp,
  FaEnvelope,
  FaLightbulb,
  FaHeart,
  FaShieldAlt,
} from "react-icons/fa";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

function LandingPage() {
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();
  const [showFullMessage, setShowFullMessage] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* =====================================================
          HERO
      ===================================================== */}
      <section
        className="
          relative
          min-h-screen
          flex
          items-center
          overflow-hidden
          bg-slate-950
        "
      >
        {/* Student Background Image */}
        <div
          className="
            absolute
            inset-0
            bg-cover
            bg-center
          "
          style={{
            backgroundImage: "url('/public/logo.jpeg')",
          }}
        />

        {/* Dark overlay */}
        <div
          className="
            absolute
            inset-0
            bg-slate-950/75
          "
        />

        {/* Green overlay */}
        <div
          className="
            absolute
            inset-0
            bg-linear-to-r
            from-green-950/90
            via-green-900/50
            to-transparent
          "
        />

        {/* Navigation */}
        <header
          className="
            absolute
            top-0
            left-0
            right-0
            z-20
            border-b
            border-white/10
            bg-black/10
            backdrop-blur-md
          "
        >
          <div
            className="
              max-w-7xl
              mx-auto
              px-6
              lg:px-8
              py-4
              flex
              items-center
              justify-between
            "
          >
            {/* Logo + School Name */}
            <div className="flex items-center gap-4">
              <div
                className="
      w-16
      h-16
      sm:w-20
      sm:h-20
      rounded-full
      bg-white
      p-1.5
      flex
      items-center
      justify-center
      shadow-xl
      overflow-hidden
      shrink-0
    "
              >
                <img
                  src="/public/logo.jpeg"
                  alt="Tenneson Comprehensive College logo"
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <p
                  className="
        text-white
        font-extrabold
        text-xl
        sm:text-2xl
        lg:text-3xl
        leading-tight
      "
                >
                  Tenneson Comprehensive College
                </p>

                <p
                  className="
        text-green-200
        text-sm
        sm:text-base
        lg:text-lg
        mt-1
      "
                >
                  Obantoko, Abeokuta, Ogun State
                </p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-7">
              <a
                href="#about"
                className="text-white/90 hover:text-white transition"
              >
                About
              </a>

              <a
                href="#mission"
                className="text-white/90 hover:text-white transition"
              >
                Mission & Vision
              </a>

              <a
                href="#contact"
                className="text-white/90 hover:text-white transition"
              >
                Contact
              </a>
            </nav>
          </div>
        </header>

        {/* Hero Content */}
        <div
          className="
            relative
            z-10
            max-w-7xl
            mx-auto
            w-full
            px-6
            lg:px-8
            pt-32
            pb-20
          "
        >
          <div className="max-w-3xl">
            <div
              className="
                inline-flex
                items-center
                gap-2
                bg-white/10
                border
                border-white/20
                backdrop-blur-md
                rounded-full
                px-4
                py-2
                text-green-100
                text-sm
                mb-6
              "
            >
              <FaSchool />

              <span>Welcome to Tenneson Comprehensive College</span>
            </div>

            <h4
              className="
                text-4xl
                sm:text-5xl
                lg:text-4xl
                font-extrabold
                text-white
                leading-tight
              "
            >
              <span className="block text-green-200">Raising Role Models.</span>
            </h4>

            <h1
              className="
                text-4xl
                sm:text-5xl
                lg:text-7xl
                font-extrabold
                text-white
                leading-tight
              "
            >
              Inspiring Minds.
              <span className="block text-green-400">Shaping Futures.</span>
            </h1>

            <p
              className="
                mt-6
                text-lg
                sm:text-xl
                text-white/80
                leading-relaxed
                max-w-2xl
              "
            >
              A nurturing and innovative learning community committed to
              academic excellence, personal growth, ethical values, and the
              development of responsible global citizens.
            </p>

            {/* Portal Buttons */}
            <div
              className="
                mt-9
                flex
                flex-col
                sm:flex-row
                gap-4
              "
            >
              <button
                type="button"
                onClick={() => navigate("/student/login")}
                className="
                  group
                  inline-flex
                  items-center
                  justify-center
                  gap-3
                  bg-green-600
                  hover:bg-green-500
                  text-white
                  px-7
                  py-4
                  rounded-xl
                  font-bold
                  shadow-xl
                  transition
                  duration-200
                "
              >
                <FaGraduationCap />
                Student Portal
                <FaArrowRight
                  className="
                    group-hover:translate-x-1
                    transition
                  "
                />
              </button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="
                  group
                  inline-flex
                  items-center
                  justify-center
                  gap-3
                  bg-white/10
                  hover:bg-white/20
                  border
                  border-white/30
                  backdrop-blur-md
                  text-white
                  px-7
                  py-4
                  rounded-xl
                  font-bold
                  transition
                  duration-200
                "
              >
                <FaShieldAlt />
                Admin Portal
                <FaArrowRight
                  className="
                    group-hover:translate-x-1
                    transition
                  "
                />
              </button>
            </div>

            <p className="mt-5 text-sm text-white/60">
              Select the portal appropriate for your role.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          ABOUT / PROPRIETOR'S MESSAGE
      ===================================================== */}
      <section id="about" className="py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p
              className="
                text-green-600
                font-bold
                uppercase
                tracking-widest
                text-sm
              "
            >
              From the Proprietor
            </p>

            <h2
              className="
                mt-3
                text-3xl
                sm:text-4xl
                font-extrabold
                text-slate-900
              "
            >
              A Message to Our Community
            </h2>
          </div>

          <div
            className="
              bg-slate-50
              border
              border-slate-200
              rounded-3xl
              p-7
              sm:p-10
              lg:p-14
              shadow-sm
            "
          >
            <div className="max-w-4xl mx-auto">
              <div className="text-5xl text-green-600/20 font-serif mb-4">
                "
              </div>

              <div
                className="
    text-slate-600
    leading-8
    text-base
    sm:text-lg
    space-y-5
  "
              >
                <p>Dear Esteemed Visitors,</p>

                <p>
                  On behalf of the entire Tenneson College, Obantoko family, I
                  am honored to welcome you to our official online portal. It is
                  a great pleasure to introduce this platform, which serves as a
                  gateway to our vibrant learning community and a reflection of
                  our school’s commitment to excellence.
                </p>

                {/* Remaining message */}
                <div className={showFullMessage ? "block" : "hidden sm:block"}>
                  <p>
                    As the proprietor of Tenneson College, Obantoko, I believe
                    in the power of connection, and this portal is designed to
                    keep us all closely connected. Whether you are a parent,
                    student, educator, or prospective member of our school
                    community, this platform will provide you with easy access
                    to important information, updates, and resources that
                    enhance your engagement with our school.
                  </p>

                  <p>
                    Through this online portal, we aim to foster better
                    communication and ensure that all stakeholders have the
                    tools they need to support the growth and development of our
                    students. It is not just a website; it is an extension of
                    the values we hold dear: integrity, excellence, innovation,
                    and a deep commitment to holistic education.
                  </p>

                  <p>
                    We invite you to explore, interact, and stay up-to-date with
                    the many opportunities, events, and accomplishments that
                    make Tenneson College, Obantoko a unique and special place.
                    Your involvement is invaluable, and together, we can
                    continue to shape the future of our students.
                  </p>

                  <p>
                    Thank you for visiting our online portal. We look forward to
                    strengthening our partnership and working with you to build
                    a bright future for the next generation of leaders.
                  </p>
                </div>
              </div>

              {/* Mobile Read More / Read Less */}
              <div className="mt-6 sm:hidden">
                <button
                  type="button"
                  onClick={() => setShowFullMessage((prev) => !prev)}
                  className="
      inline-flex
      items-center
      gap-2
      text-green-700
      font-bold
      hover:text-green-800
      transition
    "
                >
                  {showFullMessage ? "Read Less" : "Read More"}

                  <FaArrowRight
                    className={`
        transition-transform
        duration-200
        ${showFullMessage ? "-rotate-90" : "rotate-0"}
      `}
                  />
                </button>
              </div>

              <div
                className="
                  mt-8
                  pt-7
                  border-t
                  border-slate-200
                "
              >
                <p className="font-bold text-slate-900">Warm regards,</p>

                <p className="mt-1 font-semibold text-green-700">
                  Mrs Modupeola Abigail Fatukasi
                </p>

                <p className="text-sm text-slate-500">School Proprietor</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          MISSION & VISION
      ===================================================== */}
      <section id="mission" className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <p className="text-green-600 font-bold uppercase tracking-widest text-sm">
              Our Purpose
            </p>

            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">
              Mission & Vision
            </h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Vision */}
            <div
              className="
                bg-white
                rounded-3xl
                p-8
                sm:p-10
                border
                border-slate-200
                shadow-sm
              "
            >
              <div
                className="
                  w-14
                  h-14
                  rounded-2xl
                  bg-green-100
                  text-green-700
                  flex
                  items-center
                  justify-center
                  text-2xl
                  mb-6
                "
              >
                <FaLightbulb />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-5">
                Our Vision
              </h3>

              <p className="text-slate-600 leading-8">
                To foster a nurturing and innovative environment where every
                student is empowered to reach their full potential, develop a
                love for lifelong learning, and become compassionate,
                responsible global citizens.
              </p>
            </div>

            {/* Mission */}
            <div
              className="
                bg-white
                rounded-3xl
                p-8
                sm:p-10
                border
                border-slate-200
                shadow-sm
              "
            >
              <div
                className="
                  w-14
                  h-14
                  rounded-2xl
                  bg-green-100
                  text-green-700
                  flex
                  items-center
                  justify-center
                  text-2xl
                  mb-6
                "
              >
                <FaBookOpen />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-5">
                Our Mission
              </h3>

              <p className="text-slate-600 leading-8">
                Our mission is to provide a high-quality education that promotes
                academic excellence, personal growth, and ethical values. We are
                committed to creating a supportive and inclusive community where
                students are encouraged to think critically, act with integrity,
                and engage actively in the world around them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          VALUES
      ===================================================== */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-green-600 font-bold uppercase tracking-widest text-sm">
              What We Stand For
            </p>

            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">
              Our Core Values
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ValueCard
              icon={<FaShieldAlt />}
              title="Integrity"
              text="Encouraging honesty, responsibility, and strong moral character."
            />

            <ValueCard
              icon={<FaGraduationCap />}
              title="Excellence"
              text="Striving for high standards in learning, character, and achievement."
            />

            <ValueCard
              icon={<FaLightbulb />}
              title="Innovation"
              text="Encouraging curiosity, creativity, critical thinking, and new ideas."
            />

            <ValueCard
              icon={<FaHeart />}
              title="Holistic Education"
              text="Developing students academically, socially, emotionally, and ethically."
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          PORTAL ACCESS
      ===================================================== */}
      <section className="py-20 lg:py-24 bg-green-950">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="text-center text-white mb-12">
            <p className="text-green-300 font-bold uppercase tracking-widest text-sm">
              Online Portal
            </p>

            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold">
              Access Your Portal
            </h2>

            <p className="mt-4 text-green-100/80 max-w-2xl mx-auto">
              Choose the portal that corresponds with your role in the Tenneson
              school community.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Student */}
            <PortalCard
              icon={<FaGraduationCap />}
              title="Student Portal"
              description="Students can access their academic profile, results, and other student services."
              buttonText="Student Login"
              onClick={() => navigate("/student-login")}
            />

            {/* Admin */}
            <PortalCard
              icon={<FaShieldAlt />}
              title="Admin Portal"
              description="Authorized school administrators can manage students, results, sessions, and school records."
              buttonText="Admin Login"
              onClick={() => navigate("/login")}
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          CONTACT
      ===================================================== */}
      <section id="contact" className="py-20 lg:py-28 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-green-600 font-bold uppercase tracking-widest text-sm">
              Get In Touch
            </p>

            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900">
              School Information
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ContactCard
              icon={<FaMapMarkerAlt />}
              title="Address"
              text={
                <>
                  18, Muftau, Alabi Street,
                  <br />
                  Gbonagun, Obantogo,
                  <br />
                  Abeokuta, Ogun State.
                </>
              }
            />

            <ContactCard
              icon={<FaEnvelope />}
              title="Email"
              text="dupeola2015@gmail.com"
            />

            <ContactCard icon={<FaPhone />} title="Phone" text="08151324708" />

            <ContactCard
              icon={<FaClock />}
              title="Opening Hours"
              text={
                <>
                  Monday – Thursday:
                  <br />
                  8:00 AM – 4:00 PM
                  <br />
                  <span className="block mt-2">Friday: 8:00 AM – 1:00 PM</span>
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          SOCIAL MEDIA
      ===================================================== */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Connect With Tenneson
          </h2>

          <p className="mt-3 text-slate-500">
            Follow us and stay connected with the Tenneson community.
          </p>

          <div className="mt-8 flex justify-center gap-4">
            <SocialButton icon={<FaFacebook />} label="Facebook" href="#" />

            <SocialButton icon={<FaInstagram />} label="Instagram" href="#" />

            <SocialButton icon={<FaTwitter />} label="Twitter" href="#" />

            <SocialButton icon={<FaWhatsapp />} label="WhatsApp" href="#" />
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}
      <footer className="bg-slate-950 text-white">
        <div
          className="
            max-w-7xl
            mx-auto
            px-6
            lg:px-8
            py-12
          "
        >
          <div
            className="
              flex
              flex-col
              md:flex-row
              items-center
              justify-between
              gap-6
            "
          >
            <div className="flex items-center gap-3">
              <div
                className="
                  w-11
                  h-11
                  rounded-full
                  bg-white
                  p-1
                  flex
                  items-center
                  justify-center
                  overflow-hidden
                "
              >
                <img
                  src="/images/tenneson-logo.png"
                  alt="Tenneson Comprehensive College logo"
                  className="w-full h-full object-contain"
                />
              </div>

              <div>
                <p className="font-bold">Tenneson Comprehensive College</p>

                <p className="text-slate-400 text-sm">
                  Obantoko, Abeokuta, Ogun State
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <SocialButton
                icon={<FaFacebook />}
                label="Facebook"
                href="#"
                dark
              />

              <SocialButton
                icon={<FaInstagram />}
                label="Instagram"
                href="#"
                dark
              />

              <SocialButton
                icon={<FaTwitter />}
                label="Twitter"
                href="#"
                dark
              />

              <SocialButton
                icon={<FaWhatsapp />}
                label="WhatsApp"
                href="#"
                dark
              />
            </div>
          </div>

          <div
            className="
              border-t
              border-white/10
              mt-8
              pt-7
              text-center
              text-sm
              text-slate-400
            "
          >
            <p>
              © {currentYear} Tenneson Comprehensive College. All Rights
              Reserved.
            </p>

            <p className="mt-2">
              Designed & Developed by{" "}
              <span className="text-white font-semibold">Progress Chisom</span>
            </p>

            <p className="mt-1 text-xs text-slate-500">[PjazzConcept]</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* =========================================================
   VALUE CARD
========================================================= */

function ValueCard({ icon, title, text }) {
  return (
    <div
      className="
        p-7
        rounded-2xl
        border
        border-slate-200
        bg-white
        hover:-translate-y-1
        hover:shadow-lg
        transition
      "
    >
      <div
        className="
          w-12
          h-12
          rounded-xl
          bg-green-100
          text-green-700
          flex
          items-center
          justify-center
          text-xl
          mb-5
        "
      >
        {icon}
      </div>

      <h3 className="font-bold text-xl text-slate-900">{title}</h3>

      <p className="mt-3 text-slate-500 leading-7 text-sm">{text}</p>
    </div>
  );
}

/* =========================================================
   PORTAL CARD
========================================================= */

function PortalCard({ icon, title, description, buttonText, onClick }) {
  return (
    <div
      className="
        bg-white/10
        border
        border-white/10
        rounded-3xl
        p-8
        hover:bg-white/15
        transition
      "
    >
      <div
        className="
          w-14
          h-14
          rounded-2xl
          bg-green-500
          text-white
          flex
          items-center
          justify-center
          text-2xl
          mb-6
        "
      >
        {icon}
      </div>

      <h3 className="text-2xl font-bold text-white">{title}</h3>

      <p className="mt-3 text-green-100/70 leading-7">{description}</p>

      <button
        type="button"
        onClick={onClick}
        className="
          mt-6
          inline-flex
          items-center
          gap-3
          bg-white
          text-green-900
          hover:bg-green-50
          px-5
          py-3
          rounded-xl
          font-bold
          transition
        "
      >
        {buttonText}
        <FaArrowRight />
      </button>
    </div>
  );
}

/* =========================================================
   CONTACT CARD
========================================================= */

function ContactCard({ icon, title, text }) {
  return (
    <div
      className="
        bg-white
        border
        border-slate-200
        rounded-2xl
        p-7
        shadow-sm
      "
    >
      <div
        className="
          w-12
          h-12
          rounded-xl
          bg-green-100
          text-green-700
          flex
          items-center
          justify-center
          text-xl
          mb-5
        "
      >
        {icon}
      </div>

      <h3 className="font-bold text-slate-900">{title}</h3>

      <div className="mt-3 text-sm text-slate-500 leading-7">{text}</div>
    </div>
  );
}

/* =========================================================
   SOCIAL BUTTON
========================================================= */

function SocialButton({ icon, label, href, dark = false }) {
  return (
    <a
      href={href}
      aria-label={label}
      onClick={(e) => {
        if (href === "#") {
          e.preventDefault();
        }
      }}
      className={`
        w-11
        h-11
        rounded-xl
        flex
        items-center
        justify-center
        text-lg
        transition
        ${
          dark
            ? "bg-white/5 text-slate-300 hover:bg-green-600 hover:text-white"
            : "bg-slate-100 text-slate-600 hover:bg-green-600 hover:text-white"
        }
      `}
    >
      {icon}
    </a>
  );
}

export default LandingPage;
