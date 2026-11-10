import { defineAuth } from '@aws-amplify/backend'

/**
 * Email + password, confirmed with an emailed code. Phone OTP comes later
 * (SMS in India needs DLT sender registration first).
 */
export const auth = defineAuth({
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailSubject: 'Your RentiGoo code',
      verificationEmailBody: (createCode) => `Your RentiGoo code is ${createCode()}. It expires in 24 hours.`,
    },
  },
  userAttributes: {
    preferredUsername: { required: false, mutable: true },
  },
})
