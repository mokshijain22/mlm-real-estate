function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer" style={{ backgroundColor: "var(--bs-body-bg)", color: "var(--bs-body-color)" }}>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12 text-center">
            <span style={{ color: "var(--bs-body-color)" }}>{year} © 2025 Real Estate MLM. All Rights Reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;