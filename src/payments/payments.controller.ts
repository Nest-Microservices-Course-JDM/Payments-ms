import { Controller, Get, Post, Req, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentSessionDto } from './dto/payment-session';
import express from 'express';
import { EventPattern, Payload } from '@nestjs/microservices';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // @Post('create-payment-session')
  /*Stripe no está esperando confirmaciones ni validaciones
  únicamente está emitiendo un evento. Entonces, cuando solamente se
  necesita emitir un evento y no esperar ninguna respuesta se usa
  @EventPattern, en lugar de @MessagePattern
  */
  @EventPattern({cmd: 'create.payment.session'})
  createPaymentSession(@Payload() paymentSessionDto: PaymentSessionDto) {
    return this.paymentsService.createPaymentSession(paymentSessionDto);
  }

  @Get('success')
  success() {
    return{
      ok: true,
      message: 'Payment successful'
    }
  }

  @Get('cancelled')
  cancel() {
    return{
      ok: false,
      message: 'Payment cancelled'
    }
  }

  @Post('webhook')
  async stripeWebhook(@Req() req: express.Request , @Res() res: express.Response) {
    return this.paymentsService.stripeWebHook(req, res);
  }

}
