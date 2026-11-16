import { DomainError } from './domain-error';

/** Falha ao falar com outro microsserviço (não configurado, fora do ar, resposta inválida). */
export class IntegrationError extends DomainError {}
