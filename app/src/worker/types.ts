// Contrats de données des jobs. Tous portent le contexte tenant/user pour withTenant().
export interface BaseJob {
  tenantId: string;
  userId: string | null;
}

export interface TranscribeJob extends BaseJob {
  transcriptId: string;
}
export interface GenerateMinutesJob extends BaseJob {
  meetingId: string;
}
export interface ProposeUpdatesJob extends BaseJob {
  minutesId: string;
}
export interface EmbedSectionJob extends BaseJob {
  sectionId: string;
}
export interface RenderPdfJob extends BaseJob {
  deliverableId: string;
}
export interface PublishChannelJob extends BaseJob {
  publicationId: string;
}
