import { ConsoleLogger } from '@nestjs/common';

export class CustomLogger extends ConsoleLogger {
  log(message: any, stack?: string, context?: string) {
    // Don't log internal NestJS events
    const ignore = ['NestFactory', 'InstanceLoader', 'RoutesResolver', 'RouterExplorer', 'NestApplication'];
    if (ignore.includes(stack)) return;

    // @ts-ignore
    super.log(...arguments);
  }
}
