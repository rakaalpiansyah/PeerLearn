import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import assert from "node:assert/strict";
import {
  Browser,
  sleep,
} from "file:///C:/Users/ASUS/.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs";
const root = resolve("dist");
const server = createServer(async (req, res) => {
  const path = resolve(root, "." + new URL(req.url, "http://local").pathname);
  if (path !== root && !path.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const file = path === root ? resolve(root, "index.html") : path;
    const body = await readFile(file);
    res.setHeader(
      "Content-Type",
      { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" }[
        extname(file)
      ] || "application/octet-stream",
    );
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = "http://127.0.0.1:" + server.address().port;
async function until(check) {
  for (let i = 0; i < 80; i++) {
    if (await check()) return;
    await sleep(75);
  }
  throw new Error("Timed out waiting for modal state");
}
let browser;
try {
  browser = await Browser.launch();
  for (const width of [360, 768, 1440]) {
    const page = await browser.newPage({
      width,
      height: 800,
      mobile: width < 768,
    });
    let signedIn = false;
    const account = {
      id: "student-1",
      full_name: "Sari Putri",
      email: "sari@example.com",
      role: "student",
      skills: [],
    };
    const base = {
      id: "session-1",
      title: "Diskusi Graph",
      category: "Teknologi",
      description: "Belajar pohon dan graf bersama.",
      format: "online",
      status: "open",
      host_id: "host-1",
      host: { id: "host-1", full_name: "Rani", contribution_points: 10 },
      start_time: "2026-11-02T09:00:00Z",
      end_time: "2026-11-02T10:00:00Z",
      max_capacity: 8,
      current_members: 2,
      location_or_link: "https://example.com/meeting",
    };
    const fixture = () =>
      signedIn
        ? { ...base, status: "completed", user_membership: "accepted" }
        : base;
    const fulfill = async (id, status, data) =>
      page.send("Fetch.fulfillRequest", {
        requestId: id,
        responseCode: status,
        responseHeaders: [
          { name: "Content-Type", value: "application/json" },
          { name: "Access-Control-Allow-Origin", value: "*" },
          { name: "Access-Control-Allow-Headers", value: "*" },
          { name: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
        ],
        body: Buffer.from(JSON.stringify(data)).toString("base64"),
      });
    browser.on(
      page.sessionId,
      "Fetch.requestPaused",
      async ({ requestId, request }) => {
        try {
          if (request.method === "OPTIONS") {
            await fulfill(requestId, 204, {});
            return;
          }
          if (!request.url.includes("/api/v1/")) {
            await page.send("Fetch.failRequest", {
              requestId,
              errorReason: "BlockedByClient",
            });
            return;
          }
          let data = { success: true, data: [] };
          if (request.url.endsWith("/auth/login")) {
            signedIn = true;
            data = {
              success: true,
              data: { token: "browser-test", user: account },
            };
          } else if (request.url.endsWith("/auth/me"))
            data = { success: true, data: account };
          else if (request.url.includes("/my-sessions"))
            data = { success: true, data: { joined: [fixture()], hosted: [] } };
          else if (
            request.url.includes("/groups") &&
            !request.url.includes("/members") &&
            !request.url.includes("/feedbacks")
          )
            data = { success: true, data: [fixture()] };
          else if (request.url.includes("/health"))
            data = { success: true, data: { status: "ok" } };
          await fulfill(requestId, 200, data);
        } catch (error) {
          console.error(error.message);
        }
      },
    );
    await page.send("Fetch.enable", {
      patterns: [
        { urlPattern: "*://localhost:8080/api/v1/*" },
        { urlPattern: "*://fonts.googleapis.com/*" },
        { urlPattern: "*://fonts.gstatic.com/*" },
      ],
    });
    await page.send("Page.addScriptToEvaluateOnNewDocument", {
      source: "localStorage.removeItem('peerlearn_token')",
    });
    await page.goto(url, { timeoutMs: 10000, settleMs: 200 });
    const key = async (name, shift = false) => {
      const code = { Enter: 13, Tab: 9, Escape: 27 }[name];
      await page.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: name,
        code: name,
        windowsVirtualKeyCode: code,
        nativeVirtualKeyCode: code,
        modifiers: shift ? 8 : 0,
        text: name === "Enter" ? "\r" : undefined,
      });
      await page.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: name,
        code: name,
        windowsVirtualKeyCode: code,
        nativeVirtualKeyCode: code,
        modifiers: shift ? 8 : 0,
      });
      await sleep(30);
    };
    const activate = async (text, scope = "body") => {
      await page.eval(
        ({ text, scope }) => {
          const b = [
            ...document.querySelector(scope).querySelectorAll("button"),
          ].find(
            (b) =>
              (b.getAttribute("aria-label") || b.textContent.trim()) === text,
          );
          if (!b) throw new Error("Missing button " + text);
          b.scrollIntoView({ block: "center" });
          b.focus();
        },
        { text, scope },
      );
      await key("Enter");
    };
    const has = async (id) =>
      page.eval(
        (id) => !!document.getElementById(id)?.closest("dialog[open]"),
        id,
      );
    const focused = async (id) =>
      page.eval(
        (id) =>
          document
            .getElementById(id)
            ?.closest("dialog")
            ?.contains(document.activeElement),
        id,
      );
    const verifyModal = async (id) => {
      assert.equal(await focused(id), true);
      assert.equal(
        await page.eval(() => document.body.style.overflow),
        "hidden",
      );
      assert.equal(
        await page.eval(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.eval(() =>
        document.querySelector('[aria-label="Navigasi akun"] button')?.focus(),
      );
      assert.equal(await focused(id), true, "background must be inert");
      for (let i = 0; i < 12; i++) {
        await key("Tab");
        assert.equal(
          await focused(id),
          true,
          "Tab must stay within active dialog",
        );
      }
      for (let i = 0; i < 8; i++) {
        await key("Tab", true);
        assert.equal(
          await focused(id),
          true,
          "Shift+Tab must stay within active dialog",
        );
      }
    };
    await until(() =>
      page.eval(
        () =>
          !!document.querySelector('[aria-label="Lihat sesi Diskusi Graph"]'),
      ),
    );
    await activate("Lihat sesi Diskusi Graph");
    await until(() => has("group-detail-title"));
    await verifyModal("group-detail-title");
    await activate("Minta Bergabung", "dialog[open]");
    await until(() => has("auth-modal-title"));
    await verifyModal("auth-modal-title");
    await page.screenshot({
      path: ".taste-skill/modal-accessibility/login-stack-" + width + ".png",
      format: "png",
    });
    await key("Escape");
    await until(async () => !(await has("auth-modal-title")));
    assert.equal(await has("group-detail-title"), true);
    assert.equal(await focused("group-detail-title"), true);
    await activate("Minta Bergabung", "dialog[open]");
    await until(() => has("auth-modal-title"));
    await page.eval(() => {
      for (const [id, value] of Object.entries({
        email: "sari@example.com",
        password: "password123",
      })) {
        const el = document.getElementById(id);
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        ).set.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await sleep(50);
    await activate(
      "Masuk ke Akun",
      'dialog[aria-labelledby="auth-modal-title"]',
    );
    await until(() =>
      page.eval(
        () => !!document.querySelector('[aria-label="Profil Sari Putri"]'),
      ),
    );
    assert.equal(await page.eval(() => document.activeElement.tagName), "MAIN");
    assert.equal(
      await page.eval(() => document.querySelectorAll("dialog[open]").length),
      0,
    );
    await activate("Lihat sesi Diskusi Graph");
    await until(() => has("group-detail-title"));
    for (const [action, id, shot] of [
      ["Laporkan", "report-title", "report-stack"],
      ["Beri Rating Tutor", "feedback-title", "feedback-stack"],
    ]) {
      await activate(action, 'dialog[aria-labelledby="group-detail-title"]');
      await until(() => has(id));
      await verifyModal(id);
      await page.screenshot({
        path: ".taste-skill/modal-accessibility/" + shot + "-" + width + ".png",
        format: "png",
      });
      await key("Escape");
      await until(async () => !(await has(id)));
      assert.equal(await has("group-detail-title"), true);
      assert.equal(await focused("group-detail-title"), true);
    }
    await key("Escape");
    await until(async () => !(await has("group-detail-title")));
    assert.equal(
      await page.eval(() => document.activeElement.getAttribute("aria-label")),
      "Lihat sesi Diskusi Graph",
    );
    const nav =
      width < 768
        ? '[aria-label="Navigasi seluler"]'
        : '[aria-label="Navigasi akun"]';
    await activate("Sesi Saya", nav);
    await until(() => has("my-sessions-title"));
    await verifyModal("my-sessions-title");
    await activate(
      "Lihat sesi Diskusi Graph",
      'dialog[aria-labelledby="my-sessions-title"]',
    );
    await until(() => has("group-detail-title"));
    assert.equal(await has("my-sessions-title"), false);
    await verifyModal("group-detail-title");
    await key("Escape");
    await until(async () => !(await has("group-detail-title")));
    assert.notEqual(
      await page.eval(() => document.activeElement.tagName),
      "BODY",
    );
    for (const [action, id] of [
      ["Keahlian", "skills-modal-title"],
      ["Buka Sesi", "create-group-title"],
    ]) {
      await activate(action, nav);
      await until(() => has(id));
      await verifyModal(id);
      await key("Escape");
      await until(async () => !(await has(id)));
    }
    await activate("Profil Sari Putri", '[aria-label="Navigasi akun"]');
    await until(() => has("profile-modal-title"));
    await verifyModal("profile-modal-title");
    await key("Escape");
    await until(async () => !(await has("profile-modal-title")));
    assert.equal(await page.eval(() => document.body.style.overflow), "");
    assert.deepEqual(page.consoleErrors, []);
    console.log(
      JSON.stringify({
        width,
        passed:
          "all8 native dialogs; Tab/ShiftTab containment, inert background, stacked Escape, account replacement focus, session-list replacement, scroll unlock",
        api: "mocked,no database writes",
      }),
    );
    await page.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
}
