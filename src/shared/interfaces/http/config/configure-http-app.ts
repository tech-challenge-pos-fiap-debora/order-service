import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { SWAGGER_JWT_AUTH } from '../../../auth/decorators/auth-roles.decorator';
import { SERVICE_NAME } from '../../../infrastructure/observability/service-identity';
import { DomainExceptionFilter } from '../filters/domain-exception.filter';

export function configureHttpApp(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Order Service')
    .setDescription(
      [
        `${SERVICE_NAME}: ordens de serviço, diagnóstico, orçamento e execução da oficina.`,
        '',
        '## Autenticação',
        'JWT emitido pelo identity-service (`Authorization: Bearer <token>`).',
        '',
        '## Saga (coreografia SNS/SQS)',
        '- `POST /service-orders/:id/budget` publica `order.budget.requested` e deixa a OS em `WAITING_BUDGET`.',
        '- Aprovação publica `order.budget.approved` (estoque/pagamento seguem assíncronos).',
        '- Pagamento confirmado (evento do billing) inicia `IN_EXECUTION`.',
        '',
        '## Rotas públicas',
        'Grupo `Público / Ordens de Serviço`: consulta de status e aprovação/rejeição de orçamento por documento/placa.',
      ].join('\n'),
    )
    .setVersion('1.0.0')
    .addBearerAuth(undefined, SWAGGER_JWT_AUTH)
    .addTag('Ordem de Serviço / Ordens (interno)', 'Ciclo de vida da OS (atendimento/mecânico)')
    .addTag('Público / Ordens de Serviço', 'Cliente consulta e decide orçamento')
    .addTag('Ordem de Serviço / Catálogo', 'Catálogo de serviços da oficina')
    .addTag('Health', 'Liveness e readiness')
    .build();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  app.useGlobalFilters(new DomainExceptionFilter());

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
}
