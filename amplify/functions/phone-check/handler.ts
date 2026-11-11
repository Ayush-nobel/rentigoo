import { PublishCommand, SNSClient } from '@aws-sdk/client-sns'
import { env } from '$amplify/env/phone-check'
import { dataClient, phoneStore } from '../logic/amplifyStore'
import { callerId, guarded } from '../logic/handlerKit'
import { confirmPhoneCheck, forgetPhone, phoneStatus, startPhoneCheck, type SmsSender } from '../logic/phone'

const sns = new SNSClient({})

/**
 * SMS_MODE (set in backend.ts): 'test' on sandboxes (no SMS, fixed code),
 * 'sns' once the DLT IDs exist, otherwise 'off'. India requires every SMS to
 * carry the registered entity ID, template ID and sender ID.
 */
const mode = (process.env.SMS_MODE ?? 'off') as SmsSender['mode']
const sms: SmsSender = {
  mode,
  async send(to, text) {
    await sns.send(
      new PublishCommand({
        PhoneNumber: to,
        Message: text,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
          'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: process.env.SMS_SENDER_ID! },
          'AWS.MM.SMS.EntityId': { DataType: 'String', StringValue: process.env.DLT_ENTITY_ID! },
          'AWS.MM.SMS.TemplateId': { DataType: 'String', StringValue: process.env.DLT_TEMPLATE_ID! },
        },
      }),
    )
  },
}

interface Event {
  fieldName: 'phoneStatus' | 'startPhoneCheck' | 'confirmPhoneCheck' | 'forgetPhone'
  arguments: { phone?: string; code?: string }
  identity: unknown
}

export const handler = (event: Event) =>
  guarded(event.fieldName, async () => {
    const secret = env.PHONE_PEPPER
    if (!secret) throw new Error('PHONE_PEPPER secret missing')
    const ctx = { store: phoneStore(await dataClient(env)), sms, secret, now: new Date() }
    const user = callerId(event.identity)
    switch (event.fieldName) {
      case 'phoneStatus':
        return phoneStatus(ctx, user)
      case 'startPhoneCheck':
        return startPhoneCheck(ctx, user, event.arguments.phone ?? '')
      case 'confirmPhoneCheck':
        await confirmPhoneCheck(ctx, user, event.arguments.code ?? '')
        return phoneStatus(ctx, user)
      case 'forgetPhone':
        await forgetPhone(ctx, user)
        return phoneStatus(ctx, user)
    }
  })
