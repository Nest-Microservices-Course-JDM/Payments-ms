import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NATS_SERVICE, envs } from 'src/config';


/*Necesito que payment service se comunique con el servidor de NATS
Por lo tanto se necesita la configuración de nats.module.
*/
@Module({
  imports: [
    ClientsModule.register([{
      name: NATS_SERVICE,
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers
      }
    }])
  ],
  exports: [
    ClientsModule.register([{
      name: NATS_SERVICE,
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers
      }
    }])
  ]
})
export class NatsModule {}
