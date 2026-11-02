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
  await page.goto("/recherche");
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

test("a trip shows its timetable, its bus crew and a visual seat map with its legend", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/trajets?statut=boarding");
  await expect(page.getByRole("navigation", { name: "Filtrer par statut" }).getByRole("link", { name: "En embarquement" }))
    .toHaveAttribute("aria-current", "page");
  await expect(page.getByText("6 résultat(s)")).toBeVisible();
  await page.getByPlaceholder("Rechercher un trajet…").fill("DK-1022");
  await page.getByRole("row", { name: /DK-1022-AB/ }).click();

  await expect(page.getByRole("heading", { name: "Trajet Saint-Louis → Ziguinchor" })).toBeVisible();
  await expect(page.getByTestId("trip-status")).toHaveText("Embarquement");
  await expect(page.getByTestId("trip-available")).toHaveText("9 / 29");
  await expect(page.getByTestId("crew-DRIVER")).toHaveText("Babacar Seck");
  await expect(page.getByTestId("crew-CONTROLLER")).toHaveText("Non affecté");

  const map = page.getByRole("list", { name: "Plan de sièges" });
  await expect(map.locator("[data-seat]")).toHaveCount(29);
  await expect(map.locator('[data-state="free"]')).toHaveCount(9);
  await expect(map.getByRole("listitem", { name: "Siège 1A, bloqué" })).toHaveAttribute("data-state", "blocked");
  await expect(map.getByRole("listitem", { name: "Siège 1B, réservé" })).toHaveAttribute("data-state", "booked");
  await expect(map.getByRole("listitem", { name: "Siège 1C, libre" })).toHaveAttribute("data-state", "free");
  await expect(map.getByRole("listitem", { name: "Siège 1D, occupé" })).toHaveAttribute("data-state", "occupied");

  const legend = page.getByRole("list", { name: "Légende du plan de sièges" });
  for (const label of ["Libre", "Réservé", "Occupé", "Bloqué"]) await expect(legend).toContainText(label);
  await expect(page.getByTestId("seat-count-free")).toHaveText("(9)");
  await expect(page.getByTestId("seat-count-booked")).toHaveText("(10)");
  await expect(page.getByTestId("seat-count-occupied")).toHaveText("(9)");
  await expect(page.getByTestId("seat-count-blocked")).toHaveText("(1)");
});

test("the seat maps list counts the seats and opens the trip", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/plans-de-sieges");
  await expect(page.getByText("56 résultat(s)")).toBeVisible();
  await page.getByPlaceholder("Rechercher un plan de sièges…").fill("DK-1052");
  const row = page.getByRole("row", { name: /DK-1052-AB/ });
  await expect(row).toHaveCount(1);
  await expect(row.getByRole("cell", { name: "55", exact: true })).toBeVisible();
  await row.click();
  await expect(page.getByRole("heading", { name: "Trajet Touba → Mbour" })).toBeVisible();
  await expect(page.getByTestId("trip-status")).toHaveText("Parti");
  await expect(page.getByTestId("trip-available")).toHaveText("11 / 55");

  await page.goto("/flotte/trajets/00000000-0000-4000-8000-00000000dead");
  await expect(page.getByText("Trajet introuvable")).toBeVisible();
});

test("routes, stations, fleets, maintenance and vendors are readable lists", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/lignes");
  await page.getByPlaceholder("Rechercher une ligne…").fill("Casamance");
  await expect(page.getByText("3 résultat(s)")).toBeVisible();
  await page.getByRole("row", { name: /Dakar → Touba/ }).click();
  await expect(page.getByRole("heading", { name: "Ligne Dakar → Touba" })).toBeVisible();
  await expect(page.getByText("Gare routière de Dakar")).toBeVisible();
  await expect(page.getByRole("link", { name: "DK-1051-AB" })).toBeVisible();
  await expect(page.getByText("Trajets (2)")).toBeVisible();

  await page.goto("/flotte/gares");
  await page.getByPlaceholder("Rechercher une gare…").fill("Casamance");
  await expect(page.getByText("4 résultat(s)")).toBeVisible();
  await page.goto("/flotte/flottes");
  await expect(page.getByText("12 résultat(s)")).toBeVisible();

  await page.goto("/flotte/fournisseurs");
  await page.getByPlaceholder("Rechercher un fournisseur…").fill("Ziguinchor");
  const vendor = page.getByRole("row", { name: /Garage Central Ziguinchor/ });
  await expect(vendor).toContainText("Garage");
  await expect(vendor).toContainText(/175\s000/);

  await page.goto("/flotte/maintenance?statut=IN_PROGRESS");
  await expect(page.getByText("3 résultat(s)")).toBeVisible();
  await page.getByRole("row", { name: /DK-1040-AB/ }).click();
  await expect(page.getByRole("heading", { name: "DK-1040-AB" })).toBeVisible();
  await expect(page.getByRole("tabpanel").getByRole("cell", { name: "MNT-1011" })).toBeVisible();

  await page.goto("/flotte/lignes/00000000-0000-4000-8000-00000000dead");
  await expect(page.getByText("Ligne introuvable")).toBeVisible();
});

test("the fleet section is navigable and the company fleet tab links each bus and trip", async ({ page }) => {
  // Read-only.
  await login(page);
  await page.goto("/flotte/bus");
  const sidebar = page.getByRole("navigation", { name: "Navigation principale" });
  await expect(sidebar.getByRole("link", { name: "Plans de sièges" })).not.toContainText("bientôt");
  await expect(page.getByRole("navigation", { name: "Fil d'Ariane" })).toContainText("Flotte");

  await openCompany(page, "casamance", /Casamance Trans/);
  await page.getByRole("tab", { name: "Flotte et trajets" }).click();
  await page.getByRole("tabpanel").getByRole("link", { name: "DK-1050-AB" }).click();
  await expect(page.getByRole("heading", { name: "DK-1050-AB" })).toBeVisible();
  const crumbs = page.getByRole("navigation", { name: "Fil d'Ariane" });
  await expect(crumbs.getByRole("link", { name: "Bus" })).toHaveAttribute("href", "/flotte/bus");
  await expect(crumbs.getByRole("link", { name: "Flotte" })).toHaveCount(0);

  await openCompany(page, "casamance", /Casamance Trans/);
  await page.getByRole("tab", { name: "Flotte et trajets" }).click();
  await page.getByRole("tabpanel").getByRole("link", { name: "Ziguinchor → Dakar" }).click();
  await expect(page.getByRole("heading", { name: "Trajet Ziguinchor → Dakar" })).toBeVisible();
});

test("bookings can be filtered by channel and payment and opened with their timeline and tickets", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/reservations");
  await expect(page.getByRole("heading", { name: "Réservations" })).toBeVisible();
  await page.getByRole("link", { name: "Guichet", exact: true }).click();
  await expect(page).toHaveURL(/canal=counter/);
  await page.getByRole("link", { name: "Payées", exact: true }).click();
  await expect(page).toHaveURL(/canal=counter/);
  await expect(page).toHaveURL(/paiement=paid/);
  await page.getByPlaceholder("Rechercher une réservation…").fill("Coumba Lô");
  await page.getByRole("row", { name: /Coumba Lô/ }).click();
  await expect(page).toHaveURL(/\/ventes\/reservations\/[0-9a-f-]+$/);
  await expect(page.getByTestId("booking-status")).toHaveText("Confirmée");
  await expect(page.getByTestId("booking-payment")).toHaveText("Payée");
  await page.getByRole("tab", { name: "Chronologie" }).click();
  await expect(page.getByText("Paiement réussi")).toBeVisible();
  await page.getByRole("tab", { name: "Billets" }).click();
  await expect(page.getByRole("link", { name: /^TK-/ })).toHaveCount(1);
});

test("a booking without payment is cancelled with a mandatory reason", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/reservations");
  await page.getByPlaceholder("Rechercher une réservation…").fill("Rokhaya Thiaw");
  await page.getByRole("row", { name: /Rokhaya Thiaw/ }).click();
  await expect(page.getByTestId("booking-status")).toHaveText("Confirmée");
  await page.getByRole("button", { name: "Annuler la réservation" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer l'annulation" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Demande du passager au guichet");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("booking-status")).toHaveText("Annulée");
  await page.getByRole("tab", { name: "Chronologie" }).click();
  await expect(page.getByText("Réservation annulée : Annulée par l'équipe Sira")).toBeVisible();
});

test("a booking with a payment in progress cannot be cancelled", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/reservations");
  await page.getByPlaceholder("Rechercher une réservation…").fill("Samba Kébé");
  await page.getByRole("row", { name: /Samba Kébé/ }).click();
  await expect(page.getByTestId("cancel-blocked")).toContainText("Un paiement est en cours sur cette réservation");
  await page.getByRole("button", { name: "Annuler la réservation" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer l'annulation" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Un paiement est en cours sur cette réservation");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("booking-status")).toHaveText("Confirmée");
});

test("a paid booking cannot be cancelled", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/reservations");
  await page.getByPlaceholder("Rechercher une réservation…").fill("Coumba Lô");
  await page.getByRole("row", { name: /Coumba Lô/ }).click();
  await page.getByRole("button", { name: "Annuler la réservation" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer l'annulation" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Une réservation payée ne peut pas être annulée");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("booking-status")).toHaveText("Confirmée");
});

test("payment anomalies are listed and explained", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/paiements?anomalie=oui");
  await expect(page.getByText("4 résultat(s)")).toBeVisible();
  await expect(page.getByText("Paiement bloqué", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Montant différent", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Billet manquant", { exact: true })).toHaveCount(1);
  await page.getByRole("row", { name: /Paiement bloqué/ }).first().click();
  await expect(page).toHaveURL(/\/ventes\/paiements\/[0-9a-f-]+$/);
  await expect(page.getByTestId("anomaly-STUCK")).toContainText("en attente depuis plus de 30 minutes");
  await expect(page.getByTestId("transaction-status")).toHaveText("En attente");
});

test("a used ticket shows its status and scans", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/billets?statut=USED");
  await page.getByRole("row").nth(1).click();
  await expect(page).toHaveURL(/\/ventes\/billets\/TK-[0-9A-Z]{8}$/);
  await expect(page.getByTestId("ticket-status")).toHaveText("Utilisé");
  await expect(page.getByTestId("ticket-scans").locator("li")).toHaveCount(1);
});

test("an inactive payment method is shown as inactive", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/moyens-de-paiement");
  await expect(page.getByRole("heading", { name: "Moyens de paiement" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Wave.*Inactif/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Espèces au guichet.*Actif/ }).first()).toBeVisible();
});

test("the online dashboard shows the indicators and the bookings about to expire", async ({ page }) => {
  await login(page);
  await page.goto("/ventes/en-ligne");
  await expect(page.getByRole("heading", { name: "Libre-service en ligne" })).toBeVisible();
  for (const id of ["online-total", "online-conversion", "online-failed", "online-expired", "online-stuck"]) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await expect(page.getByTestId("online-stuck")).toContainText("2");
  expect(await page.getByTestId("expiring-row").count()).toBeGreaterThan(0);
});

test("parcels can be filtered by status and opened with their itinerary and history", async ({ page }) => {
  await login(page);
  await page.goto("/colis");
  await expect(page.getByRole("heading", { name: "Colis" })).toBeVisible();
  await page.getByRole("link", { name: "Livrés", exact: true }).click();
  await expect(page).toHaveURL(/statut=DELIVERED/);
  await page.getByPlaceholder("Rechercher un colis…").fill("Yacine Ndoye");
  await page.getByRole("row", { name: /Yacine Ndoye/ }).click();
  await expect(page).toHaveURL(/\/colis\/[0-9a-f-]+$/);
  await expect(page.getByTestId("parcel-status")).toHaveText("Livré");
  await page.getByRole("tab", { name: "Itinéraire" }).click();
  await expect(page.getByRole("link", { name: /→/ }).first()).toBeVisible();
  await page.getByRole("tab", { name: "Historique" }).click();
  await expect(page.getByText("Création du colis")).toBeVisible();
});

test("an in-transit parcel is declared lost with a mandatory reason", async ({ page }) => {
  await login(page);
  await page.goto("/colis");
  await page.getByPlaceholder("Rechercher un colis…").fill("Dior Kébé");
  await page.getByRole("row", { name: /Dior Kébé/ }).click();
  await expect(page.getByTestId("parcel-status")).toHaveText("En transit");
  await page.getByRole("button", { name: "Déclarer le colis perdu" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer la perte" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Introuvable lors du contrôle au hub");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("parcel-status")).toHaveText("Perdu");
  await expect(page.getByRole("button", { name: "Déclarer le colis perdu" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Historique" }).click();
  await expect(page.getByText("Introuvable lors du contrôle au hub")).toBeVisible();
});

test("a pending parcel cannot be declared lost", async ({ page }) => {
  await login(page);
  await page.goto("/colis");
  await page.getByPlaceholder("Rechercher un colis…").fill("Gorgui Sall");
  await page.getByRole("row", { name: /Gorgui Sall/ }).click();
  await expect(page.getByTestId("lost-blocked")).toContainText("Un colis en attente ne peut pas être déclaré perdu");
  await page.getByRole("button", { name: "Déclarer le colis perdu" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer la perte" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Un colis en attente ne peut pas être déclaré perdu");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("parcel-status")).toHaveText("En attente");
});

test("a delivered parcel offers no way to declare it lost", async ({ page }) => {
  await login(page);
  await page.goto("/colis?statut=DELIVERED");
  await page.getByPlaceholder("Rechercher un colis…").fill("Yacine Ndoye");
  await page.getByRole("row", { name: /Yacine Ndoye/ }).click();
  await expect(page.getByTestId("parcel-status")).toHaveText("Livré");
  await expect(page.getByRole("button", { name: "Déclarer le colis perdu" })).toHaveCount(0);
});

test("a recipient phone is masked until it is revealed on demand", async ({ page }) => {
  await login(page);
  await page.goto("/colis?statut=DELIVERED");
  await page.getByPlaceholder("Rechercher un colis…").fill("Yacine Ndoye");
  await page.getByRole("row", { name: /Yacine Ndoye/ }).click();
  await expect(page.getByTestId("masked-phone")).toHaveText(/^\+221•+\d{2}$/);
  await page.getByRole("button", { name: "Révéler la donnée" }).click();
  await expect(page.getByTestId("masked-phone")).toHaveText(/^\+2217713\d{5}$/);
  await page.getByRole("button", { name: "Masquer la donnée" }).click();
  await expect(page.getByTestId("masked-phone")).toHaveText(/^\+221•+\d{2}$/);
});

test("customer accounts list the four clients and open their loyalty, sponsorship and reviews", async ({ page }) => {
  await login(page);
  await page.goto("/clients/comptes");
  await expect(page.getByRole("heading", { name: "Comptes clients" })).toBeVisible();
  await expect(page.getByText("4 résultat(s)")).toBeVisible();
  await page.getByRole("row", { name: /Aïssatou Sarr/ }).click();
  await expect(page).toHaveURL(/\/clients\/comptes\/[0-9a-f-]+$/);
  await expect(page.getByTestId("customer-kind")).toHaveText("Particulier");
  await page.getByRole("tab", { name: "Fidélité" }).click();
  await expect(page.getByTestId("loyalty-total")).toHaveText(/^\d[\d\s  ]* pts$/);
  await page.getByRole("tab", { name: "Parrainage" }).click();
  await expect(page.getByTestId("sponsorship-row")).toHaveCount(2);
  await page.getByRole("tab", { name: "Avis" }).click();
  await expect(page.getByRole("link", { name: /\S/ }).first()).toBeVisible();

  await page.goto("/clients/comptes");
  await page.getByRole("row", { name: /Ndèye Diouf/ }).click();
  await page.getByRole("tab", { name: "Parrainage" }).click();
  await expect(page.getByTestId("sponsored-by")).toContainText("Aïssatou Sarr");

  await page.goto("/clients/comptes");
  await page.getByRole("row", { name: /Lamine Camara/ }).click();
  await expect(page.getByTestId("customer-kind")).toHaveText("Entreprise");
});

test("loyalty programs are listed with one inactive program", async ({ page }) => {
  await login(page);
  await page.goto("/clients/fidelite");
  await expect(page.getByRole("heading", { name: "Fidélité" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Inactif/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Fidélité .*Actif/ }).first()).toBeVisible();
});

test("a pending review is ignored with a mandatory reason", async ({ page }) => {
  await login(page);
  await page.goto("/clients/avis?statut=PENDING");
  await page.getByPlaceholder("Rechercher un avis…").fill("Climatisation en panne");
  await page.getByRole("row", { name: /Climatisation en panne pendant le trajet/ }).click();
  await expect(page.getByTestId("feedback-status")).toHaveText("En attente");
  await page.getByRole("button", { name: "Ignorer l'avis" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Ignorer cet avis" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Avis hors sujet signalé par la compagnie");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("feedback-status")).toHaveText("Ignoré");
  await expect(page.getByRole("button", { name: "Ignorer l'avis" })).toHaveCount(0);
  await expect(page.getByTestId("ignore-blocked")).toContainText("Cet avis est déjà traité");
});

test("a resolved review shows the company's response and cannot be ignored", async ({ page }) => {
  await login(page);
  await page.goto("/clients/avis?statut=RESOLVED");
  await page.getByPlaceholder("Rechercher un avis…").fill("Service impeccable");
  await page.getByRole("row", { name: /Service impeccable au guichet/ }).click();
  await expect(page.getByTestId("feedback-status")).toHaveText("Résolu");
  await expect(page.getByText("Merci pour votre retour, nous en avons tenu compte.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ignorer l'avis" })).toHaveCount(0);
  await expect(page.getByTestId("ignore-blocked")).toContainText("Cet avis est déjà traité");
});

test("notifications can be filtered by channel and status and show the delivery indicators", async ({ page }) => {
  await login(page);
  await page.goto("/communication/notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  for (const id of ["notif-sent", "notif-failed", "notif-pending"]) await expect(page.getByTestId(id)).toBeVisible();
  await page.getByRole("link", { name: "E-mail", exact: true }).click();
  await expect(page).toHaveURL(/canal=EMAIL/);
  await page.getByRole("link", { name: "Échouées", exact: true }).click();
  await expect(page).toHaveURL(/canal=EMAIL/);
  await expect(page).toHaveURL(/statut=FAILED/);
  expect(await page.getByRole("row").count()).toBeGreaterThan(1);
  await expect(page.getByRole("row", { name: /Échouée/ }).first()).toBeVisible();
});

test("the content of a notification is hidden until it is revealed on demand", async ({ page }) => {
  await login(page);
  await page.goto("/communication/notifications?canal=EMAIL&statut=SENT");
  await page.getByRole("row").nth(1).click();
  await expect(page).toHaveURL(/\/communication\/notifications\/[0-9a-f-]+$/);
  await expect(page.getByTestId("notification-status")).toHaveText("Envoyée");
  await expect(page.getByTestId("notification-content")).toHaveCount(0);
  await page.getByRole("button", { name: "Afficher le contenu" }).click();
  await expect(page.getByTestId("notification-content")).toContainText(/Réservation BK-[0-9A-Z]{8} confirmée/);
  await page.getByRole("button", { name: "Masquer le contenu" }).click();
  await expect(page.getByTestId("notification-content")).toHaveCount(0);
});

test("campaigns are listed and opened with their segments, messages and schedules", async ({ page }) => {
  await login(page);
  await page.goto("/communication/campagnes");
  await expect(page.getByRole("heading", { name: "Campagnes" })).toBeVisible();
  await page.getByPlaceholder("Rechercher une campagne…").fill("fin d'année");
  await page.getByRole("row", { name: /Offre de fin d'année/ }).click();
  await expect(page).toHaveURL(/\/communication\/campagnes\/[0-9a-f-]+$/);
  await expect(page.getByTestId("campaign-status")).toHaveText("Programmée");
  await page.getByRole("tab", { name: "Segments" }).click();
  await expect(page.getByText("Tous les clients").first()).toBeVisible();
  await page.getByRole("tab", { name: "Messages" }).click();
  await expect(page.getByText("Voyagez en fin d'année avec 15 % de réduction.")).toBeVisible();
  await page.getByRole("tab", { name: "Programmations" }).click();
  await expect(page.getByText("En attente", { exact: true })).toBeVisible();
});

test("cancelling a scheduled campaign also cancels its pending schedule", async ({ page }) => {
  await login(page);
  await page.goto("/communication/campagnes");
  await page.getByPlaceholder("Rechercher une campagne…").fill("Tabaski");
  await page.getByRole("row", { name: /Offre de la Tabaski/ }).click();
  await expect(page.getByTestId("campaign-status")).toHaveText("Programmée");
  await page.getByRole("button", { name: "Annuler la campagne" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer l'annulation" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Offre retirée à la demande de la compagnie");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("campaign-status")).toHaveText("Annulée");
  await expect(page.getByRole("button", { name: "Annuler la campagne" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Programmations" }).click();
  await expect(page.getByRole("tabpanel").getByText("Envoyée", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("tabpanel").getByText("Annulée", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("tabpanel").getByText("En attente", { exact: true })).toHaveCount(0);
});

test("a completed campaign cannot be cancelled", async ({ page }) => {
  await login(page);
  await page.goto("/communication/campagnes");
  await page.getByPlaceholder("Rechercher une campagne…").fill("Bilan de rentrée");
  await page.getByRole("row", { name: /Bilan de rentrée/ }).click();
  await expect(page.getByTestId("campaign-status")).toHaveText("Terminée");
  await expect(page.getByTestId("cancel-blocked")).toContainText("Une campagne en cours ou terminée ne peut pas être annulée");
  await page.getByRole("button", { name: "Annuler la campagne" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer l'annulation" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Une campagne en cours ou terminée ne peut pas être annulée");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("campaign-status")).toHaveText("Terminée");
});

test("segments show their readable targeting and the eligible accounts", async ({ page }) => {
  await login(page);
  await page.goto("/communication/segments");
  await expect(page.getByRole("heading", { name: "Segments" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Palier : VIP/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Tous les clients/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Palier inconnu « gold » \(aucun client\)/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /lastBookingDays : 90 \(non évalué\)/ }).first()).toBeVisible();
  await expect(page.getByRole("row", { name: /Réutilisable/ }).first()).toBeVisible();
});

test("messages are listed with their status", async ({ page }) => {
  await login(page);
  await page.goto("/communication/messages");
  await expect(page.getByRole("heading", { name: "Messages" })).toBeVisible();
  await page.getByRole("link", { name: "Brouillons", exact: true }).click();
  await expect(page).toHaveURL(/statut=DRAFT/);
  await expect(page.getByRole("row", { name: /E-mail.*Brouillon/ }).first()).toBeVisible();
});

test("a pending schedule is cancelled with a mandatory reason", async ({ page }) => {
  await login(page);
  await page.goto("/communication/programmations?statut=PENDING");
  await page.getByPlaceholder("Rechercher une programmation…").fill("fin d'année");
  const row = page.getByRole("row", { name: /Offre de fin d'année/ });
  await row.getByRole("button", { name: /Annuler la programmation/ }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer l'annulation" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Date d'envoi incorrecte");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Offre de fin d'année/ })).toHaveCount(0);
  await page.goto("/communication/programmations?statut=CANCELLED");
  await page.getByPlaceholder("Rechercher une programmation…").fill("fin d'année");
  await expect(page.getByRole("row", { name: /Offre de fin d'année.*Annulée/ })).toBeVisible();
});

test("a schedule that was already sent cannot be cancelled", async ({ page }) => {
  await login(page);
  await page.goto("/communication/programmations?statut=SENT");
  await page.getByPlaceholder("Rechercher une programmation…").fill("Bilan de rentrée");
  const row = page.getByRole("row", { name: /Bilan de rentrée/ });
  await row.getByRole("button", { name: /Annuler la programmation/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer l'annulation" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Cette programmation n'est plus en attente");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByRole("row", { name: /Bilan de rentrée.*Envoyée/ })).toBeVisible();
});

test("the audit trail is read-only, filterable and shows a before and after table", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/journal-audit");
  await expect(page.getByRole("heading", { name: "Journal d'audit" })).toBeVisible();
  await expect(page.getByTestId("audit-readonly")).toContainText("lecture seule");
  await page.getByRole("link", { name: "Modification", exact: true }).click();
  await expect(page).toHaveURL(/action=UPDATE/);
  await page.getByPlaceholder("Rechercher dans le journal…").fill("Company");
  await page.getByRole("row", { name: /Modification.*Company/ }).first().click();
  await expect(page).toHaveURL(/\/conformite\/journal-audit\/[0-9a-f-]+$/);
  await expect(page.getByRole("columnheader", { name: "Avant" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Après" })).toBeVisible();
  expect(await page.getByTestId("audit-change").count()).toBeGreaterThan(0);
  await expect(page.locator('[data-testid="audit-change"][data-changed="true"]').first()).toBeVisible();
});

test("login lines of the audit trail carry a truncated address only", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/journal-audit?action=LOGIN");
  await expect(page.getByRole("row", { name: /Connexion/ }).first()).toContainText(/\d+\.\d+\.\d+\.0|—/);
  await page.goto("/conformite/journal-audit?action=LOGIN_FAILED");
  await expect(page.getByRole("row", { name: /Échec de connexion/ }).first()).toBeVisible();
});

test("the data access log is read-only and filterable by type and category", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/acces-donnees");
  await expect(page.getByRole("heading", { name: "Accès aux données" })).toBeVisible();
  await page.getByRole("link", { name: "Exports", exact: true }).click();
  await expect(page).toHaveURL(/type=EXPORT/);
  await expect(page.getByRole("row", { name: /Export/ }).first()).toBeVisible();
  await page.goto("/conformite/acces-donnees?categorie=CONSENT");
  await expect(page.getByText("3 résultat(s)")).toBeVisible();
});

test("data-subject requests show the legal deadline indicators and the overdue request", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd");
  await expect(page.getByRole("heading", { name: "Demandes RGPD" })).toBeVisible();
  for (const id of ["dsr-open", "dsr-overdue", "dsr-soon", "dsr-closed"]) await expect(page.getByTestId(id)).toBeVisible();
  await expect(page.getByTestId("dsr-overdue")).toContainText("1");
  await page.getByRole("link", { name: "En retard", exact: true }).click();
  await expect(page).toHaveURL(/retard=oui/);
  await expect(page.getByRole("row", { name: /Pape Mbaye.*Rectification.*En retard de \d+ j/ })).toBeVisible();
});

test("a received request is taken in charge", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd");
  await page.getByPlaceholder("Rechercher une demande…").fill("Ndèye Diouf");
  await page.getByRole("row", { name: /Ndèye Diouf.*Accès/ }).click();
  await expect(page.getByTestId("dsr-status")).toHaveText("Reçue");
  await page.getByRole("button", { name: "Prendre en charge" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirmer la prise en charge" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("dsr-status")).toHaveText("En cours");
  await expect(page.getByRole("button", { name: "Prendre en charge" })).toHaveCount(0);
});

test("an in-progress request is closed with resolution notes and leaves a trace in the journals", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd");
  await page.getByPlaceholder("Rechercher une demande…").fill("Lamine Camara");
  await page.getByRole("row", { name: /Lamine Camara.*Effacement/ }).click();
  await expect(page.getByTestId("dsr-status")).toHaveText("En cours");
  await page.getByRole("button", { name: "Clôturer la demande" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer la clôture" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Compte et données effacés, journaux d'audit conservés.");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("dsr-status")).toHaveText("Clôturée");
  await expect(page.getByTestId("dsr-resolution")).toContainText("Compte et données effacés");
  await expect(page.getByTestId("dsr-closed-note")).toBeVisible();
  await expect(page.getByRole("button", { name: "Clôturer la demande" })).toHaveCount(0);

  await page.goto("/conformite/journal-audit?action=UPDATE");
  await page.getByPlaceholder("Rechercher dans le journal…").fill("DataSubjectRequest");
  await expect(page.getByRole("row", { name: /DataSubjectRequest/ }).first()).toBeVisible();
  await page.goto("/conformite/acces-donnees?type=MODIFY");
  await page.getByPlaceholder("Rechercher un accès…").fill("Lamine Camara");
  await expect(page.getByRole("row", { name: /Lamine Camara.*Modification/ }).first()).toBeVisible();
});

test("an in-progress request is rejected with resolution notes", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd");
  await page.getByPlaceholder("Rechercher une demande…").fill("Aïssatou Sarr");
  await page.getByRole("row", { name: /Aïssatou Sarr.*Opposition/ }).click();
  await expect(page.getByTestId("dsr-status")).toHaveText("En cours");
  await page.getByRole("button", { name: "Rejeter la demande" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Confirmer le rejet" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Opposition sans fondement légal.");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("dsr-status")).toHaveText("Rejetée");
});

test("a received request cannot be closed before it is taken in charge", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd");
  await page.getByPlaceholder("Rechercher une demande…").fill("Pape Mbaye");
  await page.getByRole("row", { name: /Pape Mbaye.*Rectification/ }).click();
  await page.getByRole("button", { name: "Clôturer la demande" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Tentative de test");
  await dialog.getByRole("button", { name: "Confirmer la clôture" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Une demande reçue doit d'abord être prise en charge");
  await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
  await expect(page.getByTestId("dsr-status")).toHaveText("Reçue");
});

test("a closed request offers no action", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/demandes-rgpd?statut=COMPLETED");
  await page.getByPlaceholder("Rechercher une demande…").fill("Aïssatou Sarr");
  await page.getByRole("row", { name: /Aïssatou Sarr.*Portabilité/ }).click();
  await expect(page.getByTestId("dsr-status")).toHaveText("Clôturée");
  await expect(page.getByTestId("dsr-closed-note")).toBeVisible();
  for (const name of ["Prendre en charge", "Clôturer la demande", "Rejeter la demande"]) {
    await expect(page.getByRole("button", { name })).toHaveCount(0);
  }
  await expect(page.getByTestId("dsr-countdown")).toHaveText("—");
});

test("consulting the consents of a user needs an access reason and is logged", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/consentements");
  await expect(page.getByRole("heading", { name: "Consentements" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Cookies et analyses.*Plateforme/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Sans compagnie \(ancien\)/ })).toBeVisible();
  await expect(page.getByTestId("consent-entry")).toHaveCount(0);
  await page.getByLabel("Utilisateur").selectOption({ label: "Aïssatou Sarr (client)" });
  await page.getByLabel("Motif d'accès").selectOption({ label: "Enquête" });
  await page.getByRole("button", { name: "Consulter" }).click();
  await expect(page.getByTestId("consent-entry").first()).toBeVisible();
  expect(await page.getByTestId("consent-entry").count()).toBeGreaterThan(2);
  await expect(page.locator('[data-testid="consent-entry"][data-current="true"]').first()).toBeVisible();
  await expect(page.locator('[data-testid="consent-entry"][data-current="false"]').first()).toBeVisible();

  await page.goto("/conformite/acces-donnees?categorie=CONSENT");
  await expect(page.getByRole("row", { name: /Aïssatou Sarr.*Enquête/ }).first()).toBeVisible();
  await expect(page.getByText("4 résultat(s)")).toBeVisible();
});

test("a company's retention can be shortened within the allowed range", async ({ page }) => {
  await login(page);
  await page.goto("/conformite/retention");
  await expect(page.getByRole("heading", { name: "Rétention des données" })).toBeVisible();
  await page.getByPlaceholder("Rechercher une compagnie…").fill("Casamance");
  const row = page.getByRole("row", { name: /Casamance Trans/ });
  await expect(row).toContainText("730 j (défaut)");
  await expect(row.getByTestId("retention-pending")).toHaveText("0");

  await row.getByRole("button", { name: "Modifier la durée de Casamance Trans" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nouvelle durée (jours)").fill("50");
  await dialog.getByLabel("Motif (obligatoire)").fill("Demande de la compagnie");
  await dialog.getByRole("button", { name: "Enregistrer la durée" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("La durée doit être un nombre entier de jours compris entre 90 et 3650");

  await dialog.getByLabel("Nouvelle durée (jours)").fill("90");
  await dialog.getByRole("button", { name: "Enregistrer la durée" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("90 j");
  await expect(row).not.toContainText("(défaut)");
  await expect(row.getByTestId("retention-pending")).not.toHaveText("0");
});

async function expectChartData(page: import("@playwright/test").Page, rows: number | RegExp) {
  const details = page.getByTestId("chart-data");
  await expect(details.locator("summary")).toHaveText("Voir les données du graphique");
  await details.locator("summary").click();
  await expect(details.getByRole("table")).toBeVisible();
  await expect(details.getByTestId("chart-data-row")).toHaveCount(rows as number);
}

test("service health shows the indicators, the outage, the stale service and the history chart", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/services");
  await expect(page.getByRole("heading", { name: "Santé des services" })).toBeVisible();
  await expect(page.getByTestId("svc-healthy")).toContainText("8");
  await expect(page.getByTestId("svc-degraded")).toContainText("1");
  await expect(page.getByTestId("svc-down")).toContainText("1");
  await expect(page.getByTestId("svc-stale")).toContainText("1");
  await expect(page.getByTestId("svc-reference")).toContainText("Dernier sondage");
  await expect(page.getByRole("row", { name: /notification-service.*En panne/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /parcel-service.*Dégradé/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /gateway.*Obsolète/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /identity-service.*Opérationnel.*100 %/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /notification-service/ })).toBeVisible();
  await expectChartData(page, 48);
  await expect(page.getByTestId("chart-data").getByRole("cell", { name: "En panne" }).first()).toBeVisible();
  await page.getByRole("link", { name: "identity-service", exact: true }).last().click();
  await expect(page).toHaveURL(/service=identity-service/);
  await expect(page.getByRole("img", { name: /identity-service/ })).toBeVisible();
});

test("incidents can be filtered by status and opened", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/incidents");
  await expect(page.getByRole("heading", { name: "Incidents" })).toBeVisible();
  await page.getByRole("link", { name: "Résolus", exact: true }).click();
  await expect(page).toHaveURL(/statut=RESOLVED/);
  await expect(page.getByRole("row", { name: /Indisponibilité de la flotte/ })).toBeVisible();
  await page.getByRole("link", { name: "Critique", exact: true }).click();
  await expect(page).toHaveURL(/gravite=CRITICAL/);
  await expect(page).toHaveURL(/statut=RESOLVED/);
  await page.getByRole("row", { name: /Indisponibilité de la flotte/ }).click();
  await expect(page).toHaveURL(/\/supervision\/incidents\/[0-9a-f-]+$/);
  await expect(page.getByTestId("incident-status")).toHaveText("Résolu");
  await expect(page.getByTestId("incident-resolved-note")).toBeVisible();
  await expect(page.getByTestId("incident-postmortem")).toHaveAttribute("href", /status\.sira\.app\/postmortems/);
  await expect(page.getByTestId("incident-duration")).not.toHaveText("");
});

test("declaring an incident adds it to the list and refuses a company scope without a company", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/incidents");
  await page.getByRole("button", { name: "Déclarer un incident" }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Déclarer l'incident" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Titre").fill("Incident de démonstration E2E");
  await dialog.getByLabel("Service").selectOption("booking-service");
  await dialog.getByLabel("Gravité").selectOption({ label: "Haute" });
  await dialog.getByLabel("Portée").selectOption({ label: "Une compagnie" });
  await expect(dialog.getByLabel("Compagnie touchée")).toBeVisible();
  await confirm.click();
  await expect(dialog.getByRole("alert")).toHaveText("Une compagnie est obligatoire pour un incident limité à une compagnie");

  await dialog.getByLabel("Portée").selectOption({ label: "Toute la plateforme" });
  await expect(dialog.getByLabel("Compagnie touchée")).toHaveCount(0);
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Incident de démonstration E2E.*booking-service.*Haute.*En investigation/ })).toBeVisible();
});

test("an incident can only move forward in status", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/incidents");
  await page.getByPlaceholder("Rechercher un incident…").fill("Échecs de réservation");
  await page.getByRole("row", { name: /Échecs de réservation sur une compagnie/ }).click();
  await expect(page.getByTestId("incident-status")).toHaveText("Identifié");
  await page.getByRole("button", { name: "Changer le statut" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nouveau statut").selectOption({ label: "En investigation" });
  await dialog.getByRole("button", { name: "Confirmer le changement" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Un incident ne peut pas revenir en arrière");
  await dialog.getByLabel("Nouveau statut").selectOption({ label: "Sous surveillance" });
  await dialog.getByRole("button", { name: "Confirmer le changement" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("incident-status")).toHaveText("Sous surveillance");
});

test("resolving an incident closes it and keeps only the postmortem editable", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/incidents");
  await page.getByPlaceholder("Rechercher un incident…").fill("Latence élevée");
  await page.getByRole("row", { name: /Latence élevée sur les colis/ }).click();
  await expect(page.getByTestId("incident-status")).toHaveText("Sous surveillance");
  await page.getByRole("button", { name: "Changer le statut" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nouveau statut").selectOption({ label: "Résolu" });
  await dialog.getByRole("button", { name: "Confirmer le changement" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("incident-status")).toHaveText("Résolu");
  await expect(page.getByTestId("incident-resolved-note")).toBeVisible();
  await expect(page.getByRole("button", { name: "Changer le statut" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Renseigner le postmortem" })).toBeVisible();
});

test("a postmortem address must be an http or https link", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/incidents?statut=RESOLVED");
  await page.getByPlaceholder("Rechercher un incident…").fill("connexion intermittent");
  await page.getByRole("row", { name: /Échec de connexion intermittent/ }).click();
  await expect(page.getByTestId("incident-postmortem")).toHaveText("Aucun");
  await page.getByRole("button", { name: "Renseigner le postmortem" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Adresse du postmortem").fill("ftp://example.org/p");
  await dialog.getByRole("button", { name: "Enregistrer le postmortem" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("L'adresse du postmortem doit commencer par http:// ou https://");
  await dialog.getByLabel("Adresse du postmortem").fill("https://status.sira.app/postmortems/2026-10-28");
  await dialog.getByRole("button", { name: "Enregistrer le postmortem" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("incident-postmortem")).toHaveAttribute("href", "https://status.sira.app/postmortems/2026-10-28");
  await expect(page.getByRole("button", { name: "Modifier le postmortem" })).toBeVisible();
});

test("API traffic shows the indicators, a daily chart and the endpoints, for a chosen period", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/api");
  await expect(page.getByRole("heading", { name: "Trafic API" })).toBeVisible();
  for (const id of ["api-requests", "api-latency", "api-4xx", "api-5xx"]) await expect(page.getByTestId(id)).toBeVisible();
  await expect(page.getByRole("img", { name: /Requêtes par jour/ })).toBeVisible();
  await expectChartData(page, 7);
  await expect(page.getByRole("row", { name: /POST.*\/auth\/login/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /GET.*\/parcels\/track\/\{id\}/ })).toBeVisible();
  await page.getByRole("link", { name: "30 jours", exact: true }).click();
  await expect(page).toHaveURL(/jours=30/);
  await expect(page.getByRole("row", { name: /GET.*\/health\/services/ })).toBeVisible();
});

test("product usage shows the derived events and the daily chart", async ({ page }) => {
  await login(page);
  await page.goto("/supervision/usage?jours=30");
  await expect(page.getByRole("heading", { name: "Usage" })).toBeVisible();
  await expect(page.getByTestId("usage-events")).toBeVisible();
  await expect(page.getByTestId("usage-users")).toBeVisible();
  await expect(page.getByRole("img", { name: /Événements produit par jour/ })).toBeVisible();
  await expectChartData(page, 30);
  await expect(page.getByRole("row", { name: /booking_created.*Réservations/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /parcel_created.*Colis/ })).toBeVisible();
});

test("the profile shows the account, the TOTP state and the current session", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/profil");
  await expect(page.getByRole("heading", { name: "Mon profil" })).toBeVisible();
  await expect(page.getByTestId("profile-identifier")).toHaveText("admin@sira.app");
  await expect(page.getByTestId("profile-totp")).toContainText("Activé depuis le");
  await expect(page.getByTestId("profile-codes")).toHaveText("8");
  const current = page.getByRole("row", { name: /Session courante/ });
  await expect(current).toBeVisible();
  await expect(current.getByRole("button", { name: /Révoquer/ })).toHaveCount(0);
  await expect(page.getByRole("table")).not.toContainText(/\b(?:41\.82|196\.207)\.\d{1,3}\.[1-9]\d{0,2}\b/);
});

test("the profile name can be changed", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/profil");
  await page.getByRole("button", { name: "Modifier mon nom" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom affiché").fill("n".repeat(101));
  await dialog.getByRole("button", { name: "Enregistrer le nom" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Le nom est trop long (100 caractères maximum)");
  await dialog.getByLabel("Nom affiché").fill("Administrateur Sira E2E");
  await dialog.getByRole("button", { name: "Enregistrer le nom" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByTestId("profile-name")).toHaveText("Administrateur Sira E2E");
  await page.getByRole("button", { name: "Modifier mon nom" }).click();
  await page.getByRole("dialog").getByLabel("Nom affiché").fill("Administrateur Sira");
  await page.getByRole("dialog").getByRole("button", { name: "Enregistrer le nom" }).click();
  await expect(page.getByTestId("profile-name")).toHaveText("Administrateur Sira");
});

test("recovery codes are shown once after regenerating them", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/profil");
  await page.getByRole("button", { name: "Régénérer mes codes de récupération" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Régénérer les codes" }).click();
  await expect(page.getByRole("dialog", { name: "Nouveaux codes de récupération" })).toBeVisible();
  await expect(page.getByTestId("recovery-code")).toHaveCount(8);
  await expect(page.getByTestId("recovery-code").first()).toHaveText(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Nouveaux codes de récupération" })).toBeVisible();
  await expect(page.getByTestId("recovery-code")).toHaveCount(8);
  await page.mouse.click(2, 2);
  await expect(page.getByTestId("recovery-code")).toHaveCount(8);
  await page.getByRole("button", { name: "J'ai noté mes codes" }).click();
  await expect(page.getByTestId("recovery-code")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("recovery-code")).toHaveCount(0);
  await expect(page.getByTestId("profile-codes")).toHaveText("8");
});

test("own sessions can be revoked one by one or all at once", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/profil");
  const android = page.getByRole("row", { name: /Application Android/ });
  await android.getByRole("button", { name: /Révoquer la session/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Révoquer la session" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(android).toContainText("Révoquée");
  await expect(android).toContainText("Révoquée par le titulaire");

  await page.getByRole("button", { name: "Révoquer toutes les autres sessions" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Révoquer les sessions" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Firefox · Ubuntu/ })).toContainText("Révoquée");
  await expect(page.getByRole("button", { name: "Révoquer toutes les autres sessions" })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Session courante/ })).toContainText("Active");
});

test("the team lists the administrators and filters by status", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  await expect(page.getByRole("heading", { name: "Équipe admin" })).toBeVisible();
  for (const id of ["admin@sira.app", "moustapha.ndiaye@sira.app", "ibrahima.sow@sira.app", "fatou.diallo@sira.app", "seynabou.kane@sira.app", "awa.fall@sira.app"]) {
    await expect(page.getByRole("row", { name: new RegExp(id.replace(/\./g, "\\.")) })).toBeVisible();
  }
  const self = page.getByRole("row", { name: /admin@sira\.app/ }).first();
  await expect(self.getByRole("button")).toHaveCount(0);
  const awa = page.getByRole("row", { name: /awa\.fall@sira\.app/ });
  await expect(awa).toContainText("Invité");
  await expect(awa).toContainText("Non enrôlé");
  await page.getByRole("link", { name: "Invités", exact: true }).click();
  await expect(page).toHaveURL(/statut=invited/);
  await expect(page.getByRole("row", { name: /awa\.fall@sira\.app/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /fatou\.diallo@sira\.app/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Suspendus", exact: true }).click();
  await expect(page).toHaveURL(/statut=suspended/);
});

test("inviting an administrator rejects a bad identifier then adds the invitation", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  await page.getByRole("button", { name: "Inviter un administrateur" }).click();
  const dialog = page.getByRole("dialog");
  const send = dialog.getByRole("button", { name: "Envoyer l'invitation" });
  await expect(send).toBeDisabled();
  await dialog.getByLabel("Identifiant de connexion").fill("mal formé");
  await dialog.getByLabel("Nom affiché").fill("Invité E2E");
  await send.click();
  await expect(dialog.getByRole("alert")).toHaveText("L'identifiant doit avoir la forme prenom.nom@sira.app");
  await dialog.getByLabel("Identifiant de connexion").fill("e2e.invite@sira.app");
  await send.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const row = page.getByRole("row", { name: /e2e\.invite@sira\.app/ });
  await expect(row).toContainText("Invité");
  await expect(row).toContainText("Non enrôlé");
});

test("suspending an administrator needs a reason", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  const row = page.getByRole("row", { name: /ibrahima\.sow@sira\.app/ });
  await expect(row).toContainText("Actif");
  await row.getByRole("button", { name: /Suspendre/ }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Suspendre le compte" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Départ de l'équipe");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("Suspendu");
  await expect(row.getByTestId("admin-sessions")).toHaveText("0");
  await expect(row.getByRole("button", { name: /Réactiver/ })).toBeVisible();
});

test("a suspended administrator can be reactivated", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  const row = page.getByRole("row", { name: /seynabou\.kane@sira\.app/ });
  await expect(row).toContainText("Suspendu");
  await row.getByRole("button", { name: /Réactiver/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Retour de congé");
  await dialog.getByRole("button", { name: "Réactiver le compte" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("Actif");
});

test("resetting the TOTP of an administrator signs them out", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  const row = page.getByRole("row", { name: /moustapha\.ndiaye@sira\.app/ });
  await expect(row.getByTestId("admin-sessions")).toHaveText("1");
  await row.getByRole("button", { name: /Réinitialiser le TOTP/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Motif (obligatoire)").fill("Téléphone perdu");
  await dialog.getByRole("button", { name: "Réinitialiser le TOTP" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row).toContainText("Non enrôlé");
  await expect(row.getByTestId("admin-sessions")).toHaveText("0");
  await expect(row.getByRole("button", { name: /Réinitialiser le TOTP/ })).toHaveCount(0);
});

test("revoking the sessions of an administrator needs a reason", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/equipe-admin");
  const row = page.getByRole("row", { name: /fatou\.diallo@sira\.app/ });
  await expect(row.getByTestId("admin-sessions")).toHaveText("2");
  await row.getByRole("button", { name: /Révoquer les sessions/ }).click();
  const dialog = page.getByRole("dialog");
  const confirm = dialog.getByRole("button", { name: "Révoquer les sessions" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Motif (obligatoire)").fill("Poste partagé");
  await confirm.click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(row.getByTestId("admin-sessions")).toHaveText("0");
  await expect(row).toContainText("Actif");
});

test("the journal shows the indicators and filters by actor, period and data reveals", async ({ page }) => {
  await login(page);
  await page.goto("/parametres/journal-backoffice");
  await expect(page.getByRole("heading", { name: "Journal du backoffice" })).toBeVisible();
  for (const id of ["journal-entries", "journal-actors", "journal-reveals"]) await expect(page.getByTestId(id)).toBeVisible();

  const ibrahima = "ibrahima.sow%40sira.app";
  await page.goto(`/parametres/journal-backoffice?acteur=${ibrahima}&jours=90`);
  await expect(page.getByRole("row", { name: /Type de document KYC désactivé/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Incident déclaré \(Haute\) sur booking-service/ })).toBeVisible();
  await page.getByRole("link", { name: "30 jours", exact: true }).click();
  await expect(page).toHaveURL(/jours=30/);
  await expect(page).toHaveURL(/acteur=ibrahima/);
  await expect(page.getByRole("row", { name: /Type de document KYC désactivé/ })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Incident déclaré \(Haute\) sur booking-service/ })).toBeVisible();

  await page.goto("/parametres/journal-backoffice?acteur=moustapha.ndiaye%40sira.app&revelations=1");
  await expect(page.getByRole("row", { name: /Donnée personnelle révélée : téléphone de pape\.mbaye/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Compagnie suspendue pour impayé/ })).toHaveCount(0);
  await page.getByRole("link", { name: "Toutes les actions", exact: true }).click();
  await expect(page.getByRole("row", { name: /Compagnie suspendue pour impayé/ })).toBeVisible();
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
  const busPath = await detailPath("/flotte/bus", "DK-1022", "Rechercher un bus…", /DK-1022-AB/);
  const routePath = await detailPath("/flotte/lignes", "Casamance", "Rechercher une ligne…", /Dakar → Touba/);
  const tripPath = await detailPath("/flotte/plans-de-sieges", "DK-1022", "Rechercher un plan de sièges…", /DK-1022-AB/);
  const casamancePath = await detailPath("/compagnies", "casamance", "Rechercher une compagnie…", /Casamance Trans/);
  const bookingPath = await detailPath("/ventes/reservations", "Coumba", "Rechercher une réservation…", /Coumba Lô/);
  const transactionPath = await detailPath("/ventes/paiements", "Samba", "Rechercher un paiement…", /Samba Kébé/);
  const ticketPath = await detailPath("/ventes/billets", "Coumba", "Rechercher un billet…", /Coumba Lô/);
  const parcelPath = await detailPath("/colis", "Yacine", "Rechercher un colis…", /Yacine Ndoye/);
  const customerPath = await detailPath("/clients/comptes", "Aïssatou", "Rechercher un client…", /Aïssatou Sarr/);
  const feedbackPath = await detailPath("/clients/avis", "Service impeccable", "Rechercher un avis…", /Service impeccable au guichet/);
  const notificationPath = await detailPath("/communication/notifications", "Réservation confirmée", "Rechercher une notification…", /Réservation confirmée/);
  const campaignPath = await detailPath("/communication/campagnes", "Bilan de rentrée", "Rechercher une campagne…", /Bilan de rentrée/);
  const auditPath = await detailPath("/conformite/journal-audit", "LOGIN", "Rechercher dans le journal…", /Connexion/);
  const incidentPath = await detailPath("/supervision/incidents", "flotte", "Rechercher un incident…", /Indisponibilité de la flotte/);
  const requestPath = await detailPath("/conformite/demandes-rgpd", "Aïssatou", "Rechercher une demande…", /Aïssatou Sarr.*Portabilité/);

  const CONTACT_EMAIL = /contact@[a-z0-9-]+\.sn/;
  const ANY_SN_EMAIL = /[a-z0-9._-]+@[a-z0-9-]+\.sn/;
  const PHONES = [/\+2217712\d{5}/, /\+2217865\d{5}/, /\+2217713\d{5}/];
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
    "/flotte/bus", "/flotte/bus?conducteur=sans", "/flotte/bus?statut=maintenance", busPath,
    `${busPath}?onglet=equipage`, `${busPath}?onglet=maintenance`, `${busPath}?onglet=trajets`,
    "/flotte/flottes", "/flotte/gares", "/flotte/lignes", routePath, "/flotte/trajets", "/flotte/trajets?statut=boarding",
    tripPath, "/flotte/plans-de-sieges", "/flotte/maintenance", "/flotte/maintenance?statut=IN_PROGRESS",
    "/flotte/fournisseurs", `${casamancePath}?onglet=flotte`,
    "/ventes/reservations", "/ventes/reservations?canal=online", "/ventes/reservations?statut=cancelled", bookingPath,
    `${bookingPath}?onglet=chronologie`, "/ventes/paiements", "/ventes/paiements?anomalie=oui", transactionPath,
    "/ventes/billets", ticketPath, "/ventes/moyens-de-paiement", "/ventes/en-ligne",
    "/colis", "/colis?statut=LOST", parcelPath, `${parcelPath}?onglet=itineraire`, `${parcelPath}?onglet=historique`,
    "/clients/comptes", customerPath, `${customerPath}?onglet=fidelite`, `${customerPath}?onglet=parrainage`,
    "/clients/fidelite", "/clients/avis", "/clients/avis?statut=PENDING", feedbackPath,
    "/communication/notifications", "/communication/notifications?canal=SMS", "/communication/notifications?statut=FAILED", notificationPath,
    "/communication/campagnes", "/communication/campagnes?statut=CANCELLED", campaignPath, `${campaignPath}?onglet=programmations`,
    "/communication/segments", "/communication/messages", "/communication/programmations",
    "/conformite/journal-audit", "/conformite/journal-audit?action=LOGIN_FAILED", auditPath,
    "/conformite/acces-donnees", "/conformite/acces-donnees?categorie=CONSENT",
    "/conformite/demandes-rgpd", "/conformite/demandes-rgpd?retard=oui", requestPath,
    "/conformite/consentements", "/conformite/retention",
    "/supervision/services", "/supervision/services?service=notification-service", "/supervision/incidents",
    "/supervision/incidents?statut=RESOLVED", incidentPath, "/supervision/api", "/supervision/api?jours=30",
    "/supervision/usage", "/supervision/usage?jours=30",
    "/parametres/profil", "/parametres/equipe-admin", "/parametres/equipe-admin?statut=suspended",
    "/parametres/journal-backoffice", "/parametres/journal-backoffice?jours=30", "/parametres/journal-backoffice?revelations=1",
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
  // Notification message content is personal data: none of it may reach the list or detail payload before a reveal.
  const CONTENT_FRAGMENTS = ["confirmée, siège", "Paiement reçu pour la réservation", "La compagnie a répondu à votre avis"];
  for (const path of ["/communication/notifications", "/communication/notifications?canal=SMS", notificationPath]) {
    const raw = await (await page.request.get(path)).text();
    await page.goto(path);
    const rendered = await page.content();
    const text = await page.locator("body").innerText();
    for (const fragment of CONTENT_FRAGMENTS) {
      expect(raw, `raw ${path} ${fragment}`).not.toContain(fragment);
      expect(rendered, `dom ${path} ${fragment}`).not.toContain(fragment);
      expect(text, `text ${path} ${fragment}`).not.toContain(fragment);
    }
  }
  // The communication pages are really rendered in the production build.
  await page.goto("/communication/notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
  expect(await page.getByRole("row").count()).toBeGreaterThan(1);
  await page.goto(notificationPath);
  await expect(page.getByRole("button", { name: "Afficher le contenu" })).toBeVisible();
  await expect(page.getByTestId("notification-content")).toHaveCount(0);
  await page.goto(campaignPath);
  await expect(page.getByTestId("campaign-status")).toBeVisible();
  // The pages are really rendered (the negative checks above would pass on an empty page).
  await page.goto("/acces/sessions");
  await expect(page.getByRole("cell", { name: /^(41\.82|196\.207)\.\d{1,3}\.0$/ }).first()).toBeVisible();
  await page.goto(employeeUserPath);
  await expect(page.getByTestId("masked-email")).toHaveText("k•••@matam-express.sn");
  await page.goto(`${busPath}?onglet=equipage`);
  await expect(page.getByTestId("crew-DRIVER")).toHaveText("Babacar Seck");
  await page.goto(tripPath);
  await expect(page.getByRole("list", { name: "Plan de sièges" }).locator("[data-seat]")).toHaveCount(29);
  // The compliance pages are really rendered in the production build, and hold back seeded sensitive strings.
  await page.goto("/conformite/journal-audit");
  await expect(page.getByRole("heading", { name: "Journal d'audit" })).toBeVisible();
  await expect(page.getByTestId("audit-readonly")).toBeVisible();
  await expect(page.getByRole("cell", { name: /^\d+\.\d+\.\d+\.0$/ }).first()).toBeVisible();
  await page.goto(auditPath);
  await expect(page.getByRole("columnheader", { name: "Avant" }).or(page.getByText("Cette action n'enregistre aucun état."))).toBeVisible();
  await page.goto("/conformite/acces-donnees");
  await expect(page.getByRole("heading", { name: "Accès aux données" })).toBeVisible();
  expect(await page.getByRole("row").count()).toBeGreaterThan(1);
  await page.goto("/conformite/demandes-rgpd");
  await expect(page.getByRole("heading", { name: "Demandes RGPD" })).toBeVisible();
  await expect(page.getByTestId("dsr-overdue")).toBeVisible();
  await page.goto(requestPath);
  await expect(page.getByTestId("dsr-status")).toBeVisible();
  await page.goto("/conformite/consentements");
  await expect(page.getByRole("heading", { name: "Consentements" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Cookies et analyses.*Plateforme/ })).toBeVisible();
  await page.goto("/conformite/retention");
  await expect(page.getByRole("heading", { name: "Rétention des données" })).toBeVisible();
  expect(await page.getByRole("row").count()).toBeGreaterThan(1);
  // The default seeded address of a line without session must never be sent whole, in the list or the detail.
  for (const path of ["/conformite/journal-audit", "/conformite/journal-audit?action=LOGIN", auditPath]) {
    const raw = await (await page.request.get(path)).text();
    expect(raw, `raw ${path} seeded address`).not.toContain("196.207.12.40");
  }
  // The consent history of a user is only returned after a consultation with an access reason.
  const consentRaw = await (await page.request.get("/conformite/consentements")).text();
  for (const fragment of ["consent-entry", "v1.0", "v1.1"]) expect(consentRaw, `consents ${fragment}`).not.toContain(fragment);
  await expect(page.getByTestId("consent-entry")).toHaveCount(0);
  // The supervision pages are really rendered in the production build (an error page cannot pass).
  await page.goto("/supervision/services");
  await expect(page.getByRole("heading", { name: "Santé des services" })).toBeVisible();
  await expect(page.getByTestId("svc-down")).toBeVisible();
  await page.goto("/supervision/services?service=notification-service");
  await expect(page.getByRole("img", { name: /notification-service/ })).toBeVisible();
  await page.goto("/supervision/incidents");
  await expect(page.getByRole("heading", { name: "Incidents" })).toBeVisible();
  expect(await page.getByRole("row").count()).toBeGreaterThan(1);
  await page.goto(incidentPath);
  await expect(page.getByTestId("incident-status")).toHaveText("Résolu");
  await expect(page.getByText("admin@sira.app").first()).toBeVisible();
  await page.goto("/supervision/api");
  await expect(page.getByRole("heading", { name: "Trafic API" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Requêtes par jour/ })).toBeVisible();
  await page.goto("/supervision/usage");
  await expect(page.getByRole("heading", { name: "Usage" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Événements produit par jour/ })).toBeVisible();
  // The author of an incident appears in the detail only, never in the list payload or the API pages.
  for (const path of ["/supervision/incidents", "/supervision/incidents?statut=RESOLVED", "/supervision/api", "/supervision/usage", "/supervision/services"]) {
    const raw = await (await page.request.get(path)).text();
    expect(raw, `raw ${path} reportedBy`).not.toContain("admin@sira.app");
    await page.goto(path);
    expect(await page.content(), `dom ${path} reportedBy`).not.toContain("admin@sira.app");
  }
  // The settings pages are really rendered in the production build (an error page cannot pass).
  await page.goto("/parametres/profil");
  await expect(page.getByRole("heading", { name: "Mon profil" })).toBeVisible();
  await expect(page.getByTestId("profile-identifier")).toHaveText("admin@sira.app");
  await expect(page.getByRole("row", { name: /Session courante/ })).toBeVisible();
  await page.goto("/parametres/equipe-admin");
  await expect(page.getByRole("heading", { name: "Équipe admin" })).toBeVisible();
  await expect(page.getByRole("row", { name: /awa\.fall@sira\.app/ })).toBeVisible();
  await page.goto("/parametres/equipe-admin?statut=suspended");
  await expect(page.getByRole("heading", { name: "Équipe admin" })).toBeVisible();
  for (const path of ["/parametres/journal-backoffice", "/parametres/journal-backoffice?jours=30", "/parametres/journal-backoffice?revelations=1"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "Journal du backoffice" })).toBeVisible();
    await expect(page.getByTestId("journal-entries")).toBeVisible();
  }
  // Seeded full addresses of the backoffice sessions never leave the server (only a.b.c.0 is shown).
  const BACKOFFICE_IPS = ["41.82.14.23", "196.207.31.8", "41.82.77.54", "196.207.5.19", "41.82.9.120", "196.207.44.67", "41.82.101.3", "196.207.88.201", "41.82.23.15"];
  for (const path of ["/parametres/profil", "/parametres/equipe-admin", "/parametres/journal-backoffice"]) {
    const raw = await (await page.request.get(path)).text();
    await page.goto(path);
    const rendered = await page.content();
    for (const ip of BACKOFFICE_IPS) {
      expect(raw, `raw ${path} ${ip}`).not.toContain(ip);
      expect(rendered, `dom ${path} ${ip}`).not.toContain(ip);
    }
  }
  await page.goto("/parametres/profil");
  await expect(page.getByRole("cell", { name: /^(41\.82|196\.207)\.\d{1,3}\.0$/ }).first()).toBeVisible();
  // Recovery codes: after a regeneration and a dismissal, no code value remains in the page or its payload.
  await page.getByRole("button", { name: "Régénérer mes codes de récupération" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Régénérer les codes" }).click();
  await expect(page.getByTestId("recovery-code")).toHaveCount(8);
  const codes = await page.getByTestId("recovery-code").allTextContents();
  expect(codes).toHaveLength(8);
  await page.getByRole("button", { name: "J'ai noté mes codes" }).click();
  for (const when of ["dismissed", "reloaded"]) {
    if (when === "reloaded") await page.reload();
    const rendered = await page.content();
    const text = await page.locator("body").innerText();
    for (const code of codes) {
      expect(rendered, `dom ${when} ${code}`).not.toContain(code.trim());
      expect(text, `text ${when} ${code}`).not.toContain(code.trim());
    }
  }
  const rawAfter = await (await page.request.get("/parametres/profil")).text();
  for (const code of codes) expect(rawAfter, `raw ${code}`).not.toContain(code.trim());
});
