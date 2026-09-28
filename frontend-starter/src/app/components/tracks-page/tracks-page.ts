import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Track } from '../../shared/models/track.model';
import { TrackService } from '../../shared/services/track.service';

// Types MIME audio autorisés par le backend
const ALLOWED_MIME_TYPES = new Set([
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
]);

// Extensions de secours si le navigateur rapporte un type MIME générique
const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.mp4']);

// Taille maximale autorisée : 25 Mo (25 * 1024 * 1024 octets)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Composant de gestion de la bibliothèque audio :
 * - Pagination serveur avec contrôles aux bornes
 * - Téléversement multipart avec validation locale (taille <= 25 Mo et format audio)
 * - Lecture audio sécurisée via Blob et ObjectURL avec révocation mémoire à la destruction
 * - Suppression de pistes avec confirmation
 */
@Component({
  imports: [ReactiveFormsModule],
  templateUrl: './tracks-page.html',
  styleUrl: './tracks-page.css',
})
export class TracksPageComponent {
  private readonly service = inject(TrackService);
  private readonly destroyRef = inject(DestroyRef);

  // État de la liste paginée
  readonly tracks = signal<Track[]>([]);
  readonly page = signal(1);
  readonly pages = signal(1);
  readonly loading = signal(false);
  readonly error = signal('');

  // État du formulaire d'upload
  readonly title = new FormControl('', { nonNullable: true });
  file?: File;
  readonly uploading = signal(false);
  readonly uploadError = signal('');
  readonly uploadSuccess = signal('');

  // État de la lecture audio
  readonly currentTrack = signal<Track | null>(null);
  readonly audioUrl = signal('');
  readonly audioLoading = signal(false);
  readonly audioError = signal('');

  constructor() {
    this.load();

    // Nettoyage de l'ObjectURL lors de la destruction du composant pour éviter les fuites mémoire
    this.destroyRef.onDestroy(() => {
      this.revokeAudioUrl();
    });
  }

  /**
   * Valide localement le fichier sélectionné avant tout envoi HTTP.
   * Vérifie la taille maximale (25 Mo) et les formats audio supportés.
   */
  choose(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0];
    this.uploadError.set('');
    this.uploadSuccess.set('');

    if (!selected) {
      this.file = undefined;
      return;
    }

    // Contrôle de la taille
    if (selected.size > MAX_FILE_SIZE) {
      const sizeMo = (selected.size / (1024 * 1024)).toFixed(1);
      this.uploadError.set(
        `Fichier trop volumineux (${sizeMo} Mo). La taille maximale autorisée est de 25 Mo.`,
      );
      this.file = undefined;
      input.value = '';
      return;
    }

    // Contrôle du format
    const ext = selected.name.slice(selected.name.lastIndexOf('.')).toLowerCase();
    const isMimeValid = ALLOWED_MIME_TYPES.has(selected.type);
    const isExtValid = ALLOWED_EXTENSIONS.has(ext);

    if (!isMimeValid && !isExtValid) {
      this.uploadError.set(
        'Format de fichier non accepté. Veuillez choisir un fichier MP3, WAV, OGG ou M4A.',
      );
      this.file = undefined;
      input.value = '';
      return;
    }

    this.file = selected;
    console.debug('[TracksPage] Fichier valide sélectionné', this.file.name);
  }

  /** Charge la liste des pistes auprès du backend pour la page courante. */
  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.service.list(this.page()).subscribe({
      next: (response) => {
        console.debug('[TracksPage] Pistes chargées', response.items.length);
        this.tracks.set(response.items);
        this.pages.set(response.pages);
        this.loading.set(false);
      },
      error: (error: { error?: { message?: string } }) => {
        console.error('[TracksPage] Chargement impossible', error);
        this.error.set(error.error?.message ?? 'Impossible de charger les pistes');
        this.loading.set(false);
      },
    });
  }

  /** Navigation de page avec contrôle strict des bornes [1, pages]. */
  go(targetPage: number): void {
    if (targetPage < 1 || targetPage > this.pages() || targetPage === this.page()) {
      return;
    }
    this.page.set(targetPage);
    this.load();
  }

  /** Envoie le fichier audio et son titre sous forme de FormData multipart. */
  upload(fileInput: HTMLInputElement): void {
    if (!this.file || this.uploading()) return;

    this.uploading.set(true);
    this.uploadError.set('');
    this.uploadSuccess.set('');

    const trackTitle = this.title.value.trim() || this.file.name;

    this.service.upload(this.file, trackTitle).subscribe({
      next: (track) => {
        console.debug('[TracksPage] Piste téléversée avec succès', track.id);
        this.uploadSuccess.set(`Piste "${track.title}" importée avec succès !`);
        this.uploading.set(false);
        this.title.setValue('');
        this.file = undefined;
        fileInput.value = '';
        // Retour sur la première page pour visualiser la nouvelle piste
        this.page.set(1);
        this.load();
      },
      error: (err: { error?: { message?: string } }) => {
        console.error('[TracksPage] Échec du téléversement', err);
        this.uploadError.set(err.error?.message ?? 'Échec lors du téléversement du fichier');
        this.uploading.set(false);
      },
    });
  }

  /** Récupère le flux audio sous forme de Blob sécurisé et génère un ObjectURL pour le lecteur. */
  play(track: Track): void {
    this.audioLoading.set(true);
    this.audioError.set('');

    this.service.audio(track.id).subscribe({
      next: (blob) => {
        console.debug('[TracksPage] Données audio reçues', track.id);
        // Révoque l'ancienne URL pour libérer la mémoire vive du navigateur
        this.revokeAudioUrl();
        const url = URL.createObjectURL(blob);
        this.audioUrl.set(url);
        this.currentTrack.set(track);
        this.audioLoading.set(false);
      },
      error: (err: { error?: { message?: string } }) => {
        console.error('[TracksPage] Impossible de lire l’audio', err);
        this.audioError.set(err.error?.message ?? `Impossible de lire la piste "${track.title}"`);
        this.audioLoading.set(false);
      },
    });
  }

  /** Supprime la piste sélectionnée avec confirmation préalable. */
  deleteTrack(track: Track): void {
    if (!confirm(`Supprimer définitivement "${track.title}" ?`)) {
      return;
    }

    this.service.delete(track.id).subscribe({
      next: () => {
        console.debug('[TracksPage] Piste supprimée', track.id);
        if (this.currentTrack()?.id === track.id) {
          this.revokeAudioUrl();
          this.audioUrl.set('');
          this.currentTrack.set(null);
        }
        this.load();
      },
      error: (err: { error?: { message?: string } }) => {
        console.error('[TracksPage] Échec de la suppression', err);
        this.error.set(err.error?.message ?? 'Impossible de supprimer cette piste');
      },
    });
  }

  /** Formate une taille en octets en Mo ou Ko lisible. */
  formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
    }
    return Math.round(bytes / 1024) + ' Ko';
  }

  /** Formate une date ISO en chaîne lisible en français. */
  formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  /** Simplifie l'affichage du format audio. */
  formatMime(mime: string): string {
    if (mime.includes('mpeg')) return 'MP3';
    if (mime.includes('wav')) return 'WAV';
    if (mime.includes('ogg')) return 'OGG';
    if (mime.includes('mp4') || mime.includes('m4a')) return 'M4A';
    return 'AUDIO';
  }

  /** Libère la ressource ObjectURL en mémoire navigateur. */
  private revokeAudioUrl(): void {
    const previous = this.audioUrl();
    if (previous) {
      URL.revokeObjectURL(previous);
    }
  }
}

