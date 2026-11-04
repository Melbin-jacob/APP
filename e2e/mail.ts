import fs from "node:fs";
import net from "node:net";
import path from "node:path";

// A tiny SMTP inbox for tests: accepts every message and saves it as a file.
export const MAIL_DIR = path.join(process.cwd(), "e2e", ".mail");

export function startInbox(port: number): Promise<net.Server> {
  fs.rmSync(MAIL_DIR, { recursive: true, force: true });
  fs.mkdirSync(MAIL_DIR, { recursive: true });
  let n = 0;
  const server = net.createServer((s) => {
    let buf = "", data = false, msg = "";
    s.write("220 e2e-inbox\r\n");
    s.on("data", (chunk) => {
      buf += chunk.toString("latin1");
      let i;
      while ((i = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 2);
        if (data) {
          if (line === ".") {
            data = false;
            fs.writeFileSync(path.join(MAIL_DIR, `${Date.now()}-${++n}.eml`), msg, "latin1");
            msg = "";
            s.write("250 OK\r\n");
          } else msg += `${line.startsWith("..") ? line.slice(1) : line}\r\n`;
          continue;
        }
        const cmd = line.slice(0, 4).toUpperCase();
        if (cmd === "EHLO" || cmd === "HELO") s.write("250-e2e-inbox\r\n250 AUTH PLAIN LOGIN\r\n");
        else if (cmd === "AUTH") s.write("235 OK\r\n");
        else if (cmd === "DATA") { data = true; s.write("354 go\r\n"); }
        else if (cmd === "QUIT") { s.write("221 bye\r\n"); s.end(); }
        else s.write("250 OK\r\n");
      }
    });
    s.on("error", () => {});
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

/** Decodes quoted-printable so links in HTML emails can be read. */
const decodeQp = (s: string) => s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

/** Waits for an email to `to` whose subject matches, and returns its decoded text. */
export async function waitForMail(to: string, subject: RegExp, timeoutMs = 15_000): Promise<string> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    for (const f of fs.existsSync(MAIL_DIR) ? fs.readdirSync(MAIL_DIR).sort().reverse() : []) {
      const raw = fs.readFileSync(path.join(MAIL_DIR, f), "latin1");
      const head = raw.slice(0, raw.indexOf("\r\n\r\n"));
      const subj = decodeQp(head.match(/^Subject: (.*(?:\r\n[ \t].*)*)/m)?.[1]?.replace(/\r\n[ \t]/g, " ") ?? "");
      if (new RegExp(`^To: .*${to.replace(/[.+]/g, "\\$&")}`, "mi").test(head) && subject.test(subj)) return Buffer.from(decodeQp(raw), "latin1").toString("utf8");
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`No email to ${to} matching ${subject} within ${timeoutMs} ms`);
}
