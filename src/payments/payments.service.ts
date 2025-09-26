import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe'
import { PaymentSessionDto } from './dto/payment-session';
import { Request, Response} from 'express';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecret)

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
    return session;
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
        const chargeSucceeded = event.data.object
        console.log({
          metadata: chargeSucceeded.metadata,
          orderId: chargeSucceeded.metadata.orderId
        })
      break;

      default:
        console.log(`Event ${event.type} not handled`);
    }
    return res.status(200).json({sig})
  }
}
