import { expect, test, type Page } from "@playwright/test";

async function startLogin(page: Page) {
  await page.goto("/connexion");
  await page.getByLabel("Identifiant").fill("admin@sira.app");
  await page.getByLabel("Mot de passe").fill("sira-demo");
  await page.getByRole("button", { name: "Continuer" }).click();
}

async function login(page: Page) {
  await startLogin(page);
  await page.getByLabel("Code à 6 chiffres").fill("123456");
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByRole("heading", { name: "Vue 360" })).toBeVisible();
}

async function openCompany(page: Page, search: string, name: RegExp) {
  await page.goto("/compagnies");
  await page.getByPlaceholder("Rechercher une compagnie…").fill(search);
  await page.getByRole("row", { name }).click();
  await expect(page.getByRole("heading", { name: name })).toBeVisible();
}

test("anonymous visitors are redirected to the login page", async ({ page }) => {
  await page.goto("/compagnies");
  await expect(page).toHaveURL(/\/connexion$/);
});

test("a wrong TOTP code is refused", async ({ page }) => {
  await startLogin(page);
  await page.getByLabel("Code à 6 chiffres").fill("000000");
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Code incorrect" })).toBeVisible();
});

test("five wrong TOTP codes lock the login attempt", async ({ page }) => {
  await startLogin(page);
  for (let i = 1; i <= 4; i++) {
    await page.getByLabel("Code à 6 chiffres").fill("000000");
    await page.getByRole("button", { name: "Valider" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Code incorrect" })).toBeVisible();
  }
  await page.getByLabel("Code à 6 chiffres").fill("000000");
  await page.getByRole("button", { name: "Valider" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Trop de tentatives, reconnecte-toi" }),
  ).toBeVisible();
});

test("login, dashboard, company KYC approval activates the company", async ({ page }) => {
  await login(page);
  await expect(page.getByText("Santé des services")).toBeVisible();

  await page.getByRole("link", { name: "Toutes les compagnies" }).click();
  await page.getByPlaceholder("Rechercher une compagnie…").fill("kolda");
  await page.getByRole("row", { name: /Kolda Voyages/ }).click();
  await expect(page.getByRole("heading", { name: "Kolda Voyages" })).toBeVisible();

  await page.getByRole("tab", { name: "Vérification KYC" }).click();
  await expect(page.getByText("5 / 6")).toBeVisible();
  await page.getByRole("button", { name: /^Approuver / }).click();

  await expect(page.getByText("6 / 6")).toBeVisible();
  await expect(page.getByTestId("company-status")).toHaveText("Active");

  await page.getByRole("tab", { name: "Activité" }).click();
  await expect(page.getByText("Compagnie activée (KYC complet)")).toBeVisible();
});

test("contact data is masked and can be revealed then hidden again", async ({ page }) => {
  await login(page);
  await openCompany(page, "matam", /Matam Express/);

  await expect(page.getByTestId("masked-email")).toContainText("•••");
  await expect(page.getByTestId("masked-email")).toHaveText(/^.•••@/);
  await page.getByRole("button", { name: "Révéler la donnée" }).first().click();
  await expect(page.getByTestId("masked-email")).not.toContainText("•••");
  await expect(page.getByTestId("masked-email")).toContainText("@matam-express.sn");

  await page.getByRole("button", { name: "Masquer la donnée" }).first().click();
  await expect(page.getByTestId("masked-email")).toHaveText(/^.•••@/);
});

test("forced activation requires a reason and marks the company", async ({ page }) => {
  await login(page);
  await openCompany(page, "saly", /Saly Shuttle/);
  await page.getByRole("tab", { name: "Vérification KYC" }).click();
  await page.getByRole("button", { name: "Forcer l'activation", exact: true }).click();

  const confirm = page.getByRole("dialog").getByRole("button", { name: "Forcer l'activation" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Motif (obligatoire)").fill("Vérifié hors ligne");
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page.getByText("Activée de force")).toBeVisible();
  await expect(page.getByTestId("company-status")).toHaveText("Active");
});

test("rejecting a document requires a reason", async ({ page }) => {
  await login(page);
  await page.goto("/compagnies/kyc");
  await page.getByRole("button", { name: /^Rejeter / }).first().click();
  const confirm = page.getByRole("button", { name: "Rejeter le document" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Motif (obligatoire)").fill("Document illisible");
  await expect(confirm).toBeEnabled();
});

test("an unknown company id shows a not-found page", async ({ page }) => {
  await login(page);
  await page.goto("/compagnies/00000000-0000-4000-8000-00000000dead");
  await expect(page.getByText("Compagnie introuvable")).toBeVisible();
});

test("the theme toggle switches the page to dark mode", async ({ page }) => {
  await login(page);
  const html = page.locator("html");
  const wasDark = ((await html.getAttribute("class")) ?? "").split(" ").includes("dark");
  await page.getByRole("button", { name: "Basculer le thème clair ou sombre" }).click();
  if (wasDark) await expect(html).not.toHaveClass(/(^|\s)dark(\s|$)/);
  else await expect(html).toHaveClass(/(^|\s)dark(\s|$)/);
});

test("the command palette opens with the keyboard and navigates to a company", async ({ page }) => {
  await login(page);
  await page.keyboard.press("ControlOrMeta+k");
  const input = page.getByPlaceholder("Aller à une page ou une compagnie…");
  await expect(input).toBeVisible();
  await input.fill("Louga");
  await page.getByRole("option", { name: "Louga Trans" }).click();
  await expect(page).toHaveURL(/\/compagnies\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { name: "Louga Trans" })).toBeVisible();
});

test("unimplemented sections show a coming-soon page", async ({ page }) => {
  await login(page);
  await page.goto("/flotte/bus");
  await expect(page.getByText("Bientôt disponible")).toBeVisible();
});

test("deactivating KYC types lets a company activate without those documents", async ({ page }) => {
  await login(page);
  const types = ["Licence de transport", "Pièce d'identité du dirigeant"];

  await page.goto("/offre/types-documents-kyc");
  for (const name of types) {
    await page.getByRole("button", { name: `Désactiver ${name}` }).click();
    const dialog = page.getByRole("dialog");
    const confirm = dialog.getByRole("button", { name: "Désactiver", exact: true });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel("Motif (obligatoire)").fill("Document non exigé pour la démonstration");
    await confirm.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.getByTestId("kyc-type-status-TRANSPORT_LICENSE")).toHaveText("Inactif");
  await expect(page.getByTestId("kyc-type-status-ID_MANAGER")).toHaveText("Inactif");

  await openCompany(page, "louga", /Louga Trans/);
  await page.getByRole("tab", { name: "Vérification KYC" }).click();
  await expect(page.getByText("3 / 4")).toBeVisible();
  await page.getByRole("button", { name: "Approuver Assurance flotte" }).click();
  await expect(page.getByText("4 / 4")).toBeVisible();
  await expect(page.getByTestId("company-status")).toHaveText("Active");

  // Restore the registry so later tests see the seed configuration.
  await page.goto("/offre/types-documents-kyc");
  for (const name of types) {
    await page.getByRole("button", { name: `Réactiver ${name}` }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Motif (obligatoire)").fill("Retour à la configuration initiale");
    await dialog.getByRole("button", { name: "Réactiver", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await expect(page.getByTestId("kyc-type-status-TRANSPORT_LICENSE")).toHaveText("Actif");
  await expect(page.getByTestId("kyc-type-status-ID_MANAGER")).toHaveText("Actif");
});

test("no contact e-mail or phone reaches the browser in page payloads @prod", async ({ page }) => {
  await login(page);
  await page.goto("/compagnies");
  await page.getByPlaceholder("Rechercher une compagnie…").fill("matam");
  await page.getByRole("row", { name: /Matam Express/ }).click();
  await expect(page.getByRole("heading", { name: /Matam Express/ })).toBeVisible();
  const companyPath = new URL(page.url()).pathname;

  const EMAIL = /contact@[a-z0-9-]+\.sn/;
  const PHONES = [/\+2217712\d{5}/, /\+2217865\d{5}/];
  for (const path of ["/compagnies", "/compagnies?statut=draft", "/compagnies/kyc", "/", companyPath]) {
    const raw = await (await page.request.get(path)).text();
    expect(raw, `raw ${path}`).not.toMatch(EMAIL);
    for (const re of PHONES) expect(raw, `raw ${path}`).not.toMatch(re);
    await page.goto(path);
    const rendered = await page.content();
    expect(rendered, `dom ${path}`).not.toMatch(EMAIL);
    for (const re of PHONES) expect(rendered, `dom ${path}`).not.toMatch(re);
  }
});
