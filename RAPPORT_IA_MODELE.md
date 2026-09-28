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

## Checkpoint DevTools Network TP1

Pour valider le TP1, relever les traces réseau suivantes dans l'onglet **Network** (filtre Fetch/XHR) :

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

---

# Rapport d'usage de l'IA - TP2

Ce document retrace les missions réalisées lors du TP2 (Bibliothèque Upload et Lecture Audio) avec l'assistance de l'IA, conformément aux consignes pédagogiques de `SUJET_ETUDIANT_TP2.md`.

---

## Mission 2 — Bibliothèque Paginée

* **Objectif :** Implémenter une bibliothèque audio paginée côté serveur avec Angular Signals et flux de contrôle natif (`@for`, `@empty`, `@if`).
* **Prompt principal :** « on commence le tp2 » / implémentation de la pagination serveur.
* **Fichiers modifiés :**
  - `frontend-starter/src/app/components/tracks-page/tracks-page.ts` : ajout du Signal `error`, gestion défensive de la pagination dans `go(page)`.
  - `frontend-starter/src/app/components/tracks-page/tracks-page.html` : boutons « Précédent » et « Suivant » désactivés aux bornes (`page() <= 1`, `page() >= pages()`) et pendant le chargement.
* **Vérifications :**
  - Chaque changement de page déclenche une requête `GET /api/tracks?page=X&limit=5`.
  - L'état vide (`@empty`) s'affiche uniquement si la bibliothèque est vide hors temps de chargement.

---

## Mission 3 — Analyse, Amélioration de l'Upload et de la Lecture Audio

* **Objectif :**
  - Valider le fichier côté client avant envoi (taille $\le 25$ Mo, types MIME audio).
  - Présenter les morceaux sous forme de cards responsives et accessibles avec métadonnées enrichies.
  - Implémenter la lecture audio authentifiée par `Blob` et `ObjectURL` avec libération mémoire rigoureuse.
  - Ajouter la suppression de morceaux (`DELETE /api/tracks/:id`).
* **Fichiers modifiés :**
  - `frontend-starter/src/app/shared/services/track.service.ts` : ajout de la méthode `delete(id)`.
  - `frontend-starter/src/app/components/tracks-page/tracks-page.ts` :
    - Contrôle de la taille maximale (25 Mo) et des formats autorisés (MPEG, WAV, OGG, M4A) dans `choose()`.
    - Signaux d'upload : `uploading`, `uploadError`, `uploadSuccess`.
    - Signaux de lecture : `currentTrack`, `audioUrl`, `audioLoading`, `audioError`.
    - Révocation de l'`ObjectURL` (`URL.revokeObjectURL`) au changement de piste et à la destruction du composant via `DestroyRef.onDestroy()`.
    - Méthode de suppression avec confirmation `deleteTrack(track)`.
    - Fonctions de formatage lisible pour la taille (`formatSize`), la date (`formatDate`) et le format (`formatMime`).
  - `frontend-starter/src/app/components/tracks-page/tracks-page.html` : refonte en cartes structurées avec badges, actions d'écoute/suppression, lecteur intégré et messages de retour.
  - `frontend-starter/src/app/components/tracks-page/tracks-page.css` : styles complets pour les cards, le lecteur, le badge de format et l'état actif.
* **Vérifications :**
  - `npm run build` : compilation Angular réussie (code 0).
  - Commits Git atomiques séparant la Mission 2 et la Mission 3.

---

## Réponses aux Questions d'Évaluation (TP2)

### 1. Localisation des étapes clés dans le code
* **Choix du fichier :** `TracksPageComponent.choose($event)` dans `tracks-page.ts`.
* **Construction du `FormData` :** `TrackService.upload(file, title)` dans `track.service.ts`.
* **Appel HTTP d'upload :** `this.http.post<Track>('/api/tracks', body)` dans `track.service.ts`.
* **Récupération du `Blob` :** `TrackService.audio(id)` avec l'option `{ responseType: 'blob' }`.
* **Création de l'`ObjectURL` :** `URL.createObjectURL(blob)` dans `TracksPageComponent.play()`.
* **Affectation au lecteur audio :** `this.audioUrl.set(url)` dans `tracks-page.ts`, lié par property binding à `<audio [src]="audioUrl()">` dans `tracks-page.html`.
* **Révocation de l'ancienne URL :** `this.revokeAudioUrl()` appelant `URL.revokeObjectURL(previous)` à chaque nouvelle lecture et lors du `destroyRef.onDestroy()`.

### 2. Pourquoi une URL directement placée dans `<audio src="...">` ne reçoit pas automatiquement le header JWT ?
Les éléments HTML multimédias natifs (`<audio>`, `<img>`, `<video>`) sont gérés directement par le sous-système de rendu du navigateur. Lorsqu'ils demandent une ressource via leur attribut `src`, ils n'utilisent pas le client HTTP d'Angular (`HttpClient`) et ne traversent donc **jamais** les intercepteurs Angular (`authInterceptor`). Par conséquent, aucun en-tête `Authorization: Bearer <token>` ne peut leur être injecté.
Pour sécuriser l'accès, l'application doit :
1. Télécharger les données binaires via `HttpClient` (qui injecte le JWT).
2. Récupérer la réponse sous forme de `Blob` binaire en mémoire.
3. Créer une URL interne au navigateur pointant sur ce Blob via `URL.createObjectURL(blob)`.
4. Donner cette URL locale temporaire au lecteur audio.

### 3. Pourquoi la validation frontend ne remplace jamais la validation backend ?
* **Rôle du frontend :** Améliore l'expérience utilisateur (*UX*) en donnant un retour immédiat sans attendre un aller-retour réseau et en évitant d'envoyer inutilement 25 Mo sur le réseau si le format est invalide.
* **Rôle du backend :** Assure la sécurité et l'intégrité du système. N'importe quel utilisateur ou attaquant peut contourner le code JavaScript d'Angular (via `curl`, Postman ou des outils d'inspection) pour envoyer directement des requêtes malveillantes. La validation côté serveur reste donc la seule garantie absolue.

### 4. Questions sur la mémoire, le buffering et le streaming audio
* **Le backend envoie-t-il le fichier entier en mémoire ou progressivement ?**
  Le backend utilise `res.sendFile(audioPath)` ([backend/src/app.js:394](file:///Users/eclipse/IdeaProjects/TechnosWeb_M1_INFO_2026_2027/backend/src/app.js#L394)). En interne, cette méthode Express s'appuie sur les streams Node.js (`fs.createReadStream`). Le fichier est donc lu depuis le disque dur et acheminé par fragments (*chunks*) vers la réponse HTTP sans charger l'intégralité du fichier audio dans la mémoire vive (RAM) du serveur Node.js.
* **Avec `HttpClient` et `responseType: "blob"`, quand le composant reçoit-il le fichier ?**
  Le composant reçoit le fichier dans le callback `next(blob)` **uniquement lorsque l'intégralité du fichier a été reçue** par le navigateur et assemblée en un objet `Blob` monolithique dans la mémoire RAM du client.
* **Si la bibliothèque contient 100 morceaux, les 100 fichiers audio sont-ils chargés en mémoire dès l'affichage de la liste ?**
  **Non.** Le chargement de la bibliothèque via `TrackService.list()` n'interroge que l'endpoint de pagination `GET /api/tracks?page=...&limit=5` qui ne renvoie que des métadonnées JSON (titre, taille, date, format) pour 5 éléments. Aucun fichier audio binaire n'est transféré tant que l'utilisateur ne clique pas sur le bouton « Écouter » d'un morceau précis.
* **Différence avec 100 éléments `<audio>` avec URL HTTP directe :**
  Si 100 balises `<audio>` étaient créées avec des URLs HTTP directes, le navigateur tenterait d'ouvrir de multiples connexions simultanées pour précharger (*preload/buffer*) les métadonnées et les premières secondes de chaque fichier audio, saturant la bande passante réseau et la mémoire du navigateur.
* **Pourquoi révoquer l'URL créée par `URL.createObjectURL` ?**
  Chaque appel à `URL.createObjectURL(blob)` crée un lien interne dans la table mémoire du navigateur empêchant le ramasse-miettes (*Garbage Collector*) de libérer les octets du `Blob`. Si l'on ne révoque pas ces URLs via `URL.revokeObjectURL()`, chaque morceau écouté reste définitivement en mémoire vive jusqu'à la fermeture de l'onglet, causant une fuite de mémoire (*memory leak*) importante.


