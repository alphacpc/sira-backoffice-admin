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
  await page.goto("/ventes/reservations");
  await expect(page.getByText("Bientôt disponible")).toBeVisible();
});

test("deactivating KYC types lets a company activate without those documents", async ({ page }) => {
  await login(page);
  const types = ["Licence de transport", "Pièce d'identité du dirigeant"];

  try {
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
  } finally {
    // Restore the registry so later tests see the seed configuration.
    await page.goto("/offre/types-documents-kyc");
    for (const name of types) {
      const reactivate = page.getByRole("button", { name: `Réactiver ${name}` });
      if (!(await reactivate.isVisible())) continue; // never deactivated (failure before that step)
      await reactivate.click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Motif (obligatoire)").fill("Retour à la configuration initiale");
      await dialog.getByRole("button", { name: "Réactiver", exact: true }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
    await expect(page.getByTestId("kyc-type-status-TRANSPORT_LICENSE")).toHaveText("Actif");
    await expect(page.getByTestId("kyc-type-status-ID_MANAGER")).toHaveText("Actif");
  }
});

test("canceling a subscription requires a reason and records the change", async ({ page }) => {
  await login(page);
  await page.goto("/facturation/abonnements");
  await page.getByPlaceholder("Rechercher un abonnement…").fill("touba");
  await page.getByRole("row", { name: /Touba Liaison/ }).click();
  await expect(page.getByRole("heading", { name: "Abonnement de Touba Liaison" })).toBeVisible();
  await expect(page.getByTestId("subscription-status")).toHaveText("Active");

  await page.getByRole("button", { name: "Annuler l'abonnement" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer l'annulation" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Fin de contrat demandée par la compagnie");
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page.getByTestId("subscription-status")).toHaveText("Annulée");
  await expect(page.getByRole("button", { name: "Annuler l'abonnement" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Historique des changements de plan" }).click();
  await expect(page.getByRole("cell", { name: "Annulation" })).toBeVisible();
});

test("an invoice can be read from the invoices list and links to its subscription", async ({ page }) => {
  await login(page);
  await page.goto("/facturation/factures");
  await page.getByPlaceholder("Rechercher une facture…").fill("INV-2026-0003");
  await page.getByRole("row", { name: /INV-2026-0003/ }).click();
  await expect(page.getByRole("heading", { name: "Facture INV-2026-0003" })).toBeVisible();
  await expect(page.getByTestId("invoice-status")).toHaveText("Payée");
  await expect(page.getByRole("link", { name: "Sahel Express" })).toBeVisible();

  await page.getByRole("link", { name: "Voir l'abonnement" }).click();
  await expect(page.getByRole("heading", { name: "Abonnement de Sahel Express" })).toBeVisible();

  await page.goto("/facturation/factures/00000000-0000-4000-8000-00000000dead");
  await expect(page.getByText("Facture introuvable")).toBeVisible();
});

test("an unpaid subscription is relaunched from the queue; a refused payment keeps it unpaid", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Voir la file des impayés" }).click();
  await expect(page.getByRole("heading", { name: "Impayés", exact: true })).toBeVisible();
  await expect(page.getByRole("row").nth(1)).toContainText("Saint-Louis Route");

  // Saint-Louis Route: the seed makes its retry fail.
  await page.getByRole("button", { name: "Relancer le paiement de Saint-Louis Route" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Relancer", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Échec du paiement");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByRole("row", { name: /Saint-Louis Route/ })).toHaveCount(1);

  // Baobab Lines: the seed makes its retry succeed.
  await page.getByRole("button", { name: "Relancer le paiement de Baobab Lines" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Relancer", exact: true }).click();
  await expect(page.getByRole("row", { name: /Baobab Lines/ })).toHaveCount(0);

  await page.goto("/facturation/abonnements");
  await page.getByPlaceholder("Rechercher un abonnement…").fill("baobab");
  await page.getByRole("row", { name: /Baobab Lines/ }).click();
  await expect(page.getByTestId("subscription-status")).toHaveText("Active");
  await page.getByRole("tab", { name: "Tentatives de paiement" }).click();
  await expect(page.getByRole("tabpanel").getByRole("cell", { name: "Payé", exact: true })).toHaveCount(2);
});

async function openUser(page: Page, search: string, username: string, displayName: string) {
  await page.goto("/utilisateurs");
  await page.getByPlaceholder("Rechercher un utilisateur…").fill(search);
  await page.getByRole("row", { name: new RegExp(username.replace(/\./g, "\\.")) }).click();
  await expect(page.getByRole("heading", { name: displayName })).toBeVisible();
}

test("changing a role requires a reason and revokes every active session", async ({ page }) => {
  // Owns ibrahima-sow.dakar-voyages: no other test mutates this account.
  await login(page);
  await openUser(page, "ibrahima-sow.dakar", "ibrahima-sow.dakar-voyages", "Ibrahima Sow");
  await expect(page.getByTestId("user-role")).toHaveText("Agent de vente");
  await page.getByRole("tab", { name: "Sessions" }).click();
  await expect(page.getByTestId("active-session-count")).toHaveText("2 session(s) active(s)");

  await page.getByRole("button", { name: "Changer le rôle" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Changer le rôle" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Nouveau rôle").selectOption({ label: "Responsable de compagnie" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Promotion au poste de responsable");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(page.getByTestId("user-role")).toHaveText("Responsable de compagnie");
  await expect(page.getByTestId("active-session-count")).toHaveText("0 session(s) active(s)");
  await expect(page.getByRole("tabpanel").getByRole("cell", { name: "Changement de rôle" })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Révoquer toutes les sessions" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Activité" }).click();
  await expect(page.getByText(/Agent de vente → Responsable de compagnie \(2 session\(s\) révoquée\(s\)\)/)).toBeVisible();
});

test("the last active administrator cannot be demoted", async ({ page }) => {
  // Read-only: the refusal changes nothing on moustapha.ndiaye.
  await login(page);
  await page.goto("/utilisateurs?role=ADMIN");
  await page.getByRole("row", { name: /moustapha\.ndiaye/ }).click();
  await expect(page.getByRole("heading", { name: "Moustapha Ndiaye" })).toBeVisible();

  await page.getByRole("button", { name: "Changer le rôle" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nouveau rôle").selectOption({ label: "Responsable de compagnie" });
  await dialog.getByLabel("Motif (obligatoire)").fill("Vérification de la protection");
  await dialog.getByRole("button", { name: "Changer le rôle" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Impossible de rétrograder le dernier administrateur actif");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();

  await expect(page.getByTestId("user-role")).toHaveText("Administrateur");
  await page.getByRole("tab", { name: "Sessions" }).click();
  await expect(page.getByTestId("active-session-count")).toHaveText("1 session(s) active(s)");
});

test("an account's e-mail is masked, revealed on demand, and the reveal is journaled", async ({ page }) => {
  // Owns khady-faye.matam-express: a reveal only adds an activity entry to this account.
  await login(page);
  await openUser(page, "khady-faye.matam", "khady-faye.matam-express", "Khady Faye");
  await expect(page.getByTestId("masked-email")).toHaveText("k•••@matam-express.sn");
  await page.getByRole("button", { name: "Révéler la donnée" }).first().click();
  await expect(page.getByTestId("masked-email")).toHaveText("khady-faye@matam-express.sn");

  await page.getByRole("tab", { name: "Activité" }).click();
  await expect(page.getByText("Donnée personnelle révélée : e-mail de khady-faye.matam-express")).toBeVisible();
  await expect(page.getByRole("tabpanel")).not.toContainText("khady-faye@matam-express.sn");
});

test("an unknown account id shows a not-found page", async ({ page }) => {
  await login(page);
  await page.goto("/utilisateurs/00000000-0000-4000-8000-00000000dead");
  await expect(page.getByText("Utilisateur introuvable")).toBeVisible();
});

test("the roles page counts accounts and the matrix shows the MANAGER grants", async ({ page }) => {
  await login(page);
  await page.goto("/acces/roles");
  await expect(page.getByTestId("role-users-ADMIN")).toHaveText("2 utilisateur(s)");
  await expect(page.getByTestId("role-permissions-MANAGER")).toHaveText("12 permission(s)");
  await expect(page.getByTestId("role-permissions-CHAUFFEUR")).toHaveText("0 permission(s)");
  const details = page.locator("details").filter({ hasText: "Permissions du rôle « Agent de vente »" });
  await details.getByText("Permissions du rôle « Agent de vente »").click();
  await expect(details.getByText("BOOKING_MANAGE")).toBeVisible();
  await expect(details.getByText("RBAC_MANAGE")).toHaveCount(0);

  await page.goto("/acces/permissions");
  await expect(page.locator('[data-testid^="grant-MANAGER-"][data-granted="true"]')).toHaveCount(12);
  for (const code of ["COMPANY_MANAGE", "COMPANY_PARTNERSHIP_MANAGE", "FLEET_MAINTENANCE_MANAGE", "USER_MANAGE"]) {
    await expect(page.getByTestId(`grant-MANAGER-${code}`)).toHaveAttribute("data-granted", "true");
  }
  for (const code of ["RBAC_MANAGE", "COMPANY_KYC_REVIEW", "COMPLIANCE_READ", "MONITORING_MANAGE", "EMPLOYEE_CONFIDENTIAL_ACCESS"]) {
    await expect(page.getByTestId(`grant-MANAGER-${code}`)).toHaveAttribute("data-granted", "false");
  }
  await expect(page.getByTestId("grant-ADMIN-RBAC_MANAGE")).toHaveAttribute("data-granted", "true");
  await expect(page.getByRole("rowheader", { name: /EMPLOYEE_CONFIDENTIAL_ACCESS/ })).toBeVisible();
});

test("a session is revoked from the platform sessions list with a mandatory reason", async ({ page }) => {
  // Owns lamine.camara's sessions: no other test mutates them.
  await login(page);
  await page.goto("/acces/sessions?role=USER");
  await page.getByPlaceholder("Rechercher une session…").fill("lamine.camara");
  await expect(page.getByRole("row", { name: /lamine\.camara/ })).toHaveCount(3);
  await expect(page.getByRole("cell", { name: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.0$/ }).first()).toBeVisible();

  await page.getByRole("button", { name: "Révoquer la session lamine.camara · Safari · iPhone" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Révoquer la session" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Téléphone signalé perdu");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /lamine\.camara/ })).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Révoquer la session lamine.camara · Safari · iPhone" })).toHaveCount(0);

  await page.getByRole("link", { name: "Lamine Camara" }).first().click();
  await expect(page.getByRole("heading", { name: "Lamine Camara" })).toBeVisible();
  await page.getByRole("tab", { name: "Sessions" }).click();
  await expect(page.getByTestId("active-session-count")).toHaveText("2 session(s) active(s)");
  await expect(page.getByRole("tabpanel").getByRole("cell", { name: "Téléphone signalé perdu" })).toBeVisible();
});

test("the company team links each employee to their platform account", async ({ page }) => {
  // Read-only.
  await login(page);
  await openCompany(page, "matam", /Matam Express/);
  await page.getByRole("tab", { name: "Équipe" }).click();
  await page.getByRole("tabpanel").getByRole("link", { name: "Khady Faye" }).click();
  await expect(page.getByRole("heading", { name: "Khady Faye" })).toBeVisible();
  await expect(page.getByText("Identifiant : khady-faye.matam-express")).toBeVisible();
  await expect(page.getByTestId("user-role")).toHaveText("Responsable de compagnie");

  await openCompany(page, "tamba", /Tamba Rapide/);
  await page.getByRole("tab", { name: "Équipe" }).click();
  await expect(page.getByRole("tabpanel").getByText("Pas encore de compte")).toBeVisible();
  await expect(page.getByRole("tabpanel").getByRole("link")).toHaveCount(0);
});

async function openBus(page: Page, plate: string) {
  await page.goto("/flotte/bus");
  await page.getByPlaceholder("Rechercher un bus…").fill(plate);
  await page.getByRole("row", { name: new RegExp(plate) }).click();
  await expect(page.getByRole("heading", { name: plate })).toBeVisible();
}

test("buses are filtered by company, the other filters are kept", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/bus");
  await expect(page.getByText("42 résultat(s)")).toBeVisible();
  await page.getByRole("navigation", { name: "Filtrer par compagnie" }).getByRole("link", { name: "Casamance Trans" }).click();
  await expect(page).toHaveURL(/compagnie=/);
  await expect(page.getByText("3 résultat(s)")).toBeVisible();
  for (const plate of ["DK-1050-AB", "DK-1051-AB", "DK-1052-AB"]) {
    await expect(page.getByRole("row", { name: new RegExp(plate) })).toBeVisible();
  }
  await page.getByRole("navigation", { name: "Filtrer par statut" }).getByRole("link", { name: "En maintenance" }).click();
  await expect(page).toHaveURL(/compagnie=.*statut=maintenance|statut=maintenance.*compagnie=/);
  await expect(page.getByText("Aucun bus.")).toBeVisible();
});

test("the missing-driver filter lists one bus per company without a driver", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/bus");
  await page.getByRole("navigation", { name: "Filtrer par conducteur" }).getByRole("link", { name: "Sans conducteur affecté" }).click();
  await expect(page).toHaveURL(/conducteur=sans/);
  await expect(page.getByText("12 résultat(s)")).toBeVisible();
  await expect(page.getByRole("cell", { name: "Aucun conducteur" })).toHaveCount(12);
});

test("a bus shows its characteristics, crew, expiries and maintenance", async ({ page }) => {
  // Read-only: DK-1050-AB is also the trips-to-come refusal test's bus, which changes nothing.
  await login(page);
  await openBus(page, "DK-1050-AB");
  await expect(page.getByText("BUS-0601 · Mercedes-Benz Tourismo · Casamance Trans")).toBeVisible();
  await expect(page.getByTestId("bus-status")).toHaveText("En service");
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByText("Autocar")).toBeVisible();
  await expect(panel.getByText("Diesel")).toBeVisible();
  await expect(panel.getByTestId("expiry-insurance")).toContainText("Expirée depuis 12 j");
  await expect(panel.getByRole("link", { name: "Ziguinchor → Dakar" })).toBeVisible();

  await page.getByRole("tab", { name: "Équipage" }).click();
  await expect(page.getByTestId("crew-DRIVER")).toHaveText("Saliou Sané");
  await expect(page.getByTestId("crew-DRIVER_ASSISTANT")).toHaveText("Alioune Lo");
  await expect(page.getByTestId("crew-CONTROLLER")).toHaveText("Mamadou Diagne");

  await page.getByRole("tab", { name: "Maintenance" }).click();
  await expect(page.getByRole("tabpanel").getByRole("cell", { name: "MNT-1015" })).toBeVisible();
});

test("a bus without maintenance in progress or trips to come is taken out of service with a mandatory reason", async ({ page }) => {
  // Owns DK-1051-AB (Casamance Trans): no other test mutates this bus.
  await login(page);
  await openBus(page, "DK-1051-AB");
  await expect(page.getByTestId("bus-status")).toHaveText("En service");

  await page.getByRole("button", { name: "Mettre hors service" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Mettre hors service" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Moteur hors d'usage");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await expect(page.getByTestId("bus-status")).toHaveText("Hors service");
  await expect(page.getByRole("button", { name: "Mettre hors service" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Équipage" }).click();
  await expect(page.getByTestId("crew-DRIVER")).toHaveText("Serigne Mbaye");

  await openCompany(page, "casamance", /Casamance Trans/);
  await page.getByRole("tab", { name: "Activité" }).click();
  await expect(page.getByText("Bus DK-1051-AB mis hors service. Motif : Moteur hors d'usage")).toBeVisible();
});

test("a bus with a maintenance in progress cannot be taken out of service", async ({ page }) => {
  // Read-only: the refusal changes nothing on DK-1040-AB.
  await login(page);
  await openBus(page, "DK-1040-AB");
  await page.getByRole("button", { name: "Mettre hors service" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Vérification de la protection");
  await dialog.getByRole("button", { name: "Mettre hors service" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Une maintenance est en cours sur ce bus");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("bus-status")).toHaveText("Maintenance");
});

test("a bus with trips to come cannot be taken out of service", async ({ page }) => {
  // Read-only: the refusal changes nothing on DK-1050-AB.
  await login(page);
  await openBus(page, "DK-1050-AB");
  await page.getByRole("button", { name: "Mettre hors service" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Vérification de la protection");
  await dialog.getByRole("button", { name: "Mettre hors service" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Ce bus a des trajets à venir");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("bus-status")).toHaveText("En service");
});

test("an unknown bus id shows a not-found page", async ({ page }) => {
  await login(page);
  await page.goto("/flotte/bus/00000000-0000-4000-8000-00000000dead");
  await expect(page.getByText("Bus introuvable")).toBeVisible();
});

test("no contact e-mail, phone or full IP address reaches the browser in page payloads @prod", async ({ page }) => {
  await login(page);

  async function detailPath(listPath: string, search: string, placeholder: string, row: RegExp): Promise<string> {
    await page.goto(listPath);
    await page.getByPlaceholder(placeholder).fill(search);
    await page.getByRole("row", { name: row }).first().click();
    await expect(page).not.toHaveURL(new RegExp(`${listPath}$`));
    return new URL(page.url()).pathname;
  }

  const companyPath = await detailPath("/compagnies", "matam", "Rechercher une compagnie…", /Matam Express/);
  const planPath = await detailPath("/offre/plans", "Enterprise", "Rechercher un plan…", /Enterprise/);
  const subscriptionPath = await detailPath("/facturation/abonnements", "matam", "Rechercher un abonnement…", /Matam Express/);
  const invoicePath = await detailPath("/facturation/factures", "matam", "Rechercher une facture…", /Matam Express/);
  const employeeUserPath = await detailPath("/utilisateurs", "khady-faye.matam", "Rechercher un utilisateur…", /khady-faye\.matam-express/);
  const adminUserPath = await detailPath("/utilisateurs", "moustapha", "Rechercher un utilisateur…", /moustapha\.ndiaye/);
  const clientUserPath = await detailPath("/utilisateurs", "lamine", "Rechercher un utilisateur…", /lamine\.camara/);

  const CONTACT_EMAIL = /contact@[a-z0-9-]+\.sn/;
  const ANY_SN_EMAIL = /[a-z0-9._-]+@[a-z0-9-]+\.sn/;
  const PHONES = [/\+2217712\d{5}/, /\+2217865\d{5}/];
  // Seed session addresses start with 41.82 or 196.207 and never end in 0: only a.b.c.0 may appear.
  const FULL_IP = /\b(?:41\.82|196\.207)\.\d{1,3}\.[1-9]\d{0,2}\b/;
  const paths = [
    "/compagnies", "/compagnies?statut=draft", "/compagnies/kyc", "/", companyPath, `${companyPath}?onglet=equipe`,
    "/offre/plans", planPath, "/offre/fonctionnalites", "/offre/paliers-partenaires", "/offre/types-documents-kyc",
    "/facturation/abonnements", "/facturation/abonnements?statut=past_due", subscriptionPath,
    "/facturation/paiements", "/facturation/paiements?statut=failed",
    "/facturation/factures", invoicePath, "/facturation/impayes",
    "/utilisateurs", "/utilisateurs?role=ADMIN", "/utilisateurs?statut=suspended",
    employeeUserPath, `${employeeUserPath}?onglet=sessions`, adminUserPath, `${clientUserPath}?onglet=sessions`,
    "/acces/roles", "/acces/permissions", "/acces/sessions", "/acces/sessions?role=USER",
  ];
  for (const path of paths) {
    const raw = await (await page.request.get(path)).text();
    expect(raw, `raw ${path}`).not.toMatch(CONTACT_EMAIL);
    expect(raw, `raw ${path}`).not.toMatch(ANY_SN_EMAIL);
    for (const re of PHONES) expect(raw, `raw ${path}`).not.toMatch(re);
    expect(raw, `raw ${path}`).not.toMatch(FULL_IP);
    await page.goto(path);
    const rendered = await page.content();
    expect(rendered, `dom ${path}`).not.toMatch(CONTACT_EMAIL);
    expect(rendered, `dom ${path}`).not.toMatch(ANY_SN_EMAIL);
    for (const re of PHONES) expect(rendered, `dom ${path}`).not.toMatch(re);
    expect(rendered, `dom ${path}`).not.toMatch(FULL_IP);
  }
  // The truncated form is really rendered (the negative checks above would pass on an empty page).
  await page.goto("/acces/sessions");
  await expect(page.getByRole("cell", { name: /^(41\.82|196\.207)\.\d{1,3}\.0$/ }).first()).toBeVisible();
  await page.goto(employeeUserPath);
  await expect(page.getByTestId("masked-email")).toHaveText("k•••@matam-express.sn");
});
