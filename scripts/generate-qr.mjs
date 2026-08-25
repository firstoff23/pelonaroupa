import fs from "node:fs";
import QRCode from "qrcode";

async function main() {
  const svg = await QRCode.toString("https://animalmind.vercel.app", {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: {
      dark: "#050608",
      light: "#f8fafc",
    },
  });

  fs.writeFileSync("client/public/qr-code.svg", svg, "utf-8");
  console.log(
    "Successfully generated client/public/qr-code.svg (" +
      svg.length +
      " bytes)",
  );
}

main().catch(console.error);
