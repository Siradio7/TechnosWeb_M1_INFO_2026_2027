# Rapport d'usage de l'IA - TP1

Ce document retrace les missions réalisées lors du TP1 (Architecture Authentification et Profil) avec l'assistance de l'IA, conformément aux consignes pédagogiques de `SUJET_ETUDIANT_TP1.md` et `CONSEILS_POUR_UTIISER_ASSISTANT_AI.md`.

---

## Mission 0 — Cartographie et Architecture de l'Application

* **Objectif :** Repérer l'architecture du frontend Angular 22 standalone, identifier les fichiers clés, tracer le flux de la requête de connexion et distinguer les routes publiques des routes protégées de l'API sans modifier le code.
* **Prompt principal :** « on va faire le tp1 » / demande de cartographie et d'analyse initiale.
* **Modèle utilisé :** Gemini 3.8 Flash (modèle polyvalent et réactif, adapté à l'analyse multi-fichiers TypeScript/Node.js).
* **Fichiers consultés :**
  - `frontend-starter/src/main.ts` (enregistrement `HttpClient`, `provideRouter`, `authInterceptor`)
  - `frontend-starter/src/app/routes.ts` (définition des routes et du `authGuard`)
  - `frontend-starter/src/app/shared/interceptors/auth.interceptor.ts` (interception HTTP)
  - `frontend-starter/src/app/shared/guards/auth.guard.ts` (protection de navigation)
  - `frontend-starter/src/app/shared/services/auth.service.ts` (service d'authentification)
  - `backend/src/app.js` et `API_CONTRACT.md` (contrat d'API)
* **Schéma annoté du flux lors du clic sur « Se connecter » :**
  ```text
  1. Utilisateur : clic sur "Se connecter" dans LoginPageComponent
  2. LoginPageComponent : lit form.getRawValue() -> appelle AuthService.login(email, password)
  3. AuthService : exécute this.http.post<AuthResponse>('/api/auth/login', { email, password })
  4. HttpClient & authInterceptor : requête transmise (aucun jeton initial)
  5. proxy.conf.json : redirige /api vers le serveur backend (http://localhost:3000)
  6. Backend Express (app.js) :
     - Vérifie identifiants avec bcrypt.compare via User.findOne().select('+passwordHash')
     - Signe un JWT valide 2h (jwt.sign({ sub, email }, SECRET))
     - Répond HTTP 200 { token, user }
  7. AuthService (pipe tap) :
     - Stocke le token et le profil dans localStorage ('gpc_token', 'gpc_user')
     - Met à jour les Signals token() et currentUser()
  8. LoginPageComponent (subscribe.next) : redirige vers /tracks via Router.navigateByUrl
  9. Router Angular : active TracksPageComponent (authGuard valide car token() != null)
  ```
* **Distinction des routes API (`API_CONTRACT.md`) :**
  - *Routes publiques :* `GET /api/health`, `POST /api/auth/register`, `POST /api/auth/login`.
  - *Routes protégées (Bearer JWT requis) :* `GET /api/users/me`, `PUT /api/users/me`, `GET /api/tracks`, `POST /api/tracks`, `GET /api/tracks/:id/audio`, `DELETE /api/tracks/:id`.
* **Ce que le binôme sait expliquer :**
  - Le chemin d'une requête HTTP traversant l'intercepteur Angular, le proxy de développement et atteignant Express/Mongoose.
  - La localisation exacte de la mise à jour du profil : côté front dans `ProfilePageComponent.save()` et `AuthService.update()`, côté back dans `backend/src/app.js` (`PUT /api/users/me`).

---

## Mission 1 — Inscription, Connexion, Déconnexion et Profil Réactif

* **Objectif :**
  - Mettre en place des formulaires réactifs avec validations strictes.
  - Sauvegarder le JWT et le profil sans jamais afficher de secret dans les logs.
  - Implémenter la déconnexion avec nettoyage de l'état local.
  - Gérer l'expiration de session (HTTP 401) dans l'intercepteur pour renvoyer vers `/login`.
  - Assurer un profil réactif avec chargement automatique et modification du nom.
* **Prompt principal :** « on comment à implémenter »
* **Plan proposé par l'agent :**
  1. *Étape 1 (Sécurité HTTP) :* Interception des 401 dans `auth.interceptor.ts` avec redirection vers `/login` et déconnexion automatique.
  2. *Étape 2 (État réactif) :* Persistance et réhydratation du profil utilisateur dans `auth.service.ts` avec signal calculé `isLoggedIn = computed(() => !!this.token())`.
  3. *Étape 3 (Interface globale) :* Navigation dynamique dans `app.html` et `app.ts` affichant l'état connecté, le nom de l'utilisateur et le bouton « Déconnexion ».
  4. *Étape 4 (Formulaires & Profil) :* Validation stricte des formulaires (mot de passe $\ge 8$ car., nom $\ge 2$ car.), chargement automatique du profil dans `profile-page.ts` et notifications réactives.
* **Fichiers effectivement modifiés :**
  - `frontend-starter/src/app/shared/interceptors/auth.interceptor.ts` : gestion du statut 401 via RxJS `catchError`.
  - `frontend-starter/src/app/shared/services/auth.service.ts` : ajout de `computed()`, clés constantes, persistance et réhydratation de `currentUser`.
  - `frontend-starter/src/app/components/app/app.ts`, `app.html`, `app.css` : en-tête réactif avec `@if (auth.isLoggedIn())` et bouton de déconnexion.
  - `frontend-starter/src/app/components/login-page/login-page.ts`, `login-page.html` : indicateur de chargement et gestion des erreurs d'authentification.
  - `frontend-starter/src/app/components/register-page/register-page.ts`, `register-page.html` : contraintes de validation alignées sur l'API et messages d'erreurs contextuels.
  - `frontend-starter/src/app/components/profile-page/profile-page.ts`, `profile-page.html` : chargement automatique à l'initialisation, formulaires réactifs et retours visuels (succès/erreur).
* **Vérifications et preuves de fonctionnement :**
  - `npm run build` dans `frontend-starter` : compilation Angular réussie avec code de sortie 0.
  - `npm test` dans `backend` : les 2 tests d'API existants passent avec succès.
  - Respect strict de l'étanchéité : aucun fichier du backend n'a été modifié lors de la mission frontend.
* **Erreurs ou propositions rejetées :**
  - Rejet de l'interception du code 401 sur la route `/api/auth/login` afin de ne pas masquer l'erreur « Identifiants incorrects » saisie par l'utilisateur.
  - Pas d'ajout de décorateurs obsolètes ou de modules NgModule : utilisation stricte des fonctionnalités modernes d'Angular 22 (`inject()`, Signals, `@if`).
* **Ce que le binôme sait expliquer sans l'agent :**
  - **Différence entre Signal et localStorage :**
    - Un **Signal** est un objet réactif en mémoire vive : dès que sa valeur change, Angular met à jour immédiatement les éléments du DOM qui en dépendent. Cependant, son état est éphémère et disparaît au rechargement de la page (`F5`).
    - Le **`localStorage`** est un stockage persistant fourni par le navigateur : il conserve des données texte sur disque même après fermeture du navigateur, mais il n'est pas réactif (Angular ne peut pas détecter automatiquement une écriture dans `localStorage`).
    - *Association des deux :* Au démarrage, `AuthService` initialise son Signal à partir de la valeur stockée dans `localStorage` pour concilier persistance et réactivité.

---

## Checkpoint DevTools Network (À compléter lors de la séance)

Pour valider le TP, relever les traces réseau suivantes dans l'onglet **Network** (filtre Fetch/XHR) :

1. **Connexion réussie :**
   - Requête : `POST /api/auth/login`
   - Corps envoyé : `{"email":"demo@example.com","password":"..."}`
   - Statut retourné : `200 OK`
   - Réponse : JSON contenant `{ token: "...", user: { id: "...", name: "Demo", email: "..." } }`
2. **Consultation / Modification du profil :**
   - Requête : `PUT /api/users/me`
   - En-tête présent : `Authorization: Bearer eyJ...`
   - Corps envoyé : `{"name":"NouveauNom"}`
   - Statut retourné : `200 OK`
3. **Capture d'écran Network :**
   *(Ajouter ici les captures d'écran des requêtes DevTools du binôme).*

