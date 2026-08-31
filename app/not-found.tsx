import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ textAlign: "center", maxWidth: "30rem" }}>
        <div style={{ fontSize: "3rem", fontWeight: 800, marginBottom: "0.5rem" }}>404</div>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>Page not found</h2>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/" style={{ color: "#7c3aed", fontWeight: 600 }}>Go home</Link>
      </div>
    </div>
  );
}
