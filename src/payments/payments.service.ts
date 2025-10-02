import { Inject, Injectable, Logger } from '@nestjs/common';
import { envs, NATS_SERVICE } from 'src/config';
import Stripe from 'stripe'
import { PaymentSessionDto } from './dto/payment-session';
import { Request, Response} from 'express';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecret)
  private readonly logger = new Logger('PaymentService')

  constructor(
    @Inject(NATS_SERVICE) private readonly client: ClientProxy
  ){}
  async createPaymentSession(paymentSessionDto: PaymentSessionDto){
    
    const {currency, items, orderId} = paymentSessionDto;
    
    const lineItems = items.map(item => {
      return{
        price_data:{
          currency: currency,
          product_data: {
            name: item.name
          },
          unit_amount: Math.round(item.price*100), //20 dólares
        },
        quantity: item.quantity
      }
    })


    const session = await this.stripe.checkout.sessions.create({
      //Colocar el id de mi orden
      payment_intent_data: {
        metadata: {
          orderId: orderId
        }        
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: envs.stripeSuccessUrl,
      cancel_url: envs.stripeCancelUrl,
    });
    return {
      cancelUrl: session.cancel_url,
      successUrl: session.success_url,
      url: session.url
    };
  }


  async stripeWebHook(req: Request, res: Response){
    const sig = req.headers['stripe-signature'];
    let event: Stripe.Event;


    // const endpointSecret = "whsec_bb1dd88ceea62a6e071181d1f5d5059ae908a8f3d56ee991ff1351187eb338dc";
    const endpointSecret = envs.stripeEndpointSecret;

    if (!sig) {
      res.status(400).send('Webhook Error: Missing or invalid Stripe signature');
      return;
    }
    
    try {
      event = this.stripe.webhooks.constructEvent(req['rawBody'], sig, endpointSecret);      
    } catch (error) {
      res.status(400).send(`Webhook Error: ${error.message}`);
      return;
    }


    switch(event.type){
      case 'charge.succeeded':
        //LLAMAR MICROSERVICIO
        const chargeSucceeded = event.data.object;
        const payload = {
          stripePaymentId: chargeSucceeded.id, 
          orderId: chargeSucceeded.metadata.orderId,
          receiptUrl: chargeSucceeded.receipt_url
        }
        // this.logger.log({payload}) 
        /*
        Se debe poner a orders a escuchar este evento "emit" (lugares interesados)
        específicamente en el ordersController
        */
        this.client.emit({cmd:'payment.succeeded'}, payload)
      break;

      default:
        console.log(`Event ${event.type} not handled`);
    }
    return res.status(200).json({sig})
  }
}
