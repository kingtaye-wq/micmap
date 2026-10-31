import QRCode from "qrcode";

export async function generateQrSvgString(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 240,
    color: {
      dark: "#0B0B14",
      light: "#FFFFFF",
    },
  });
}
