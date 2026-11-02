// DPDP Act 2023 Statutory Notice & Grievance Information
// Section 5 Notice Requirements in Plain Language (English & Hindi)

export const GRIEVANCE_OFFICER = {
  name: 'Adv. Ananya Sundaram',
  designation: 'Chief Privacy & Grievance Redressal Officer (DPDP Act, 2023)',
  address: 'Level 3, NivasPay Regional Hub, Ganga Lake Road, Chandranagar, Itanagar, Arunachal Pradesh 791113, India',
  email: 'grievance.dpdp@nivaspay.in',
  phone: '+91 (0360) 224-8991',
  responseSlaHours: 48,
  supervisoryBody: 'Data Protection Board of India (DPBI), New Delhi',
};

export const DPDP_NOTICE_TEXT = {
  en: {
    title: 'Notice under Section 5, Digital Personal Data Protection Act, 2023',
    version: 'DPDP-2023-v2.4',
    summary: 'NivasPay acts as a Data Fiduciary. We collect only strictly necessary data to process your rental tenancy application.',
    purposes: [
      {
        title: 'Application Verification & Suitability',
        dataItems: 'Name, age, gender, occupation, family size, pet status',
        retention: 'Retained for 90 days after tenancy decision or until account deletion request.',
        reason: 'To verify eligibility against the homeowner\'s objective tenancy rules (occupants, pets).'
      },
      {
        title: 'Sensitive Personal Data (Religion & Tribe)',
        dataItems: 'Religion, Scheduled Tribe / Community identity',
        retention: 'Purged immediately upon application termination or within 14 days maximum.',
        reason: 'OPTIONAL. Kept encrypted at rest. NEVER shared with property owners unless you grant explicit, affirmative, unbundled consent. Not searchable and never used in filtering.'
      },
      {
        title: 'Payment Processing & Escrow (RBI Route Compliance)',
        dataItems: 'Phone number, UPI VPA, Transaction IDs, Billing Address for GST invoice',
        retention: 'Retained for 7 years as mandated by RBI Master Directions and GST Law 2017.',
        reason: 'To process ₹20 application fee, 10% brokerage upon acceptance, and security deposit escrow payouts.'
      }
    ],
    rights: [
      'Right to Access: View or download a full portable JSON copy of all data processed.',
      'Right to Correction: Update or rectify incorrect demographic details anytime.',
      'Right to Erasure (RTBF): Request complete permanent deletion of non-statutory data.',
      'Right of Grievance Redressal: 48-hour SLA response from our designated Grievance Officer.',
      'Right to Withdraw: Revoke consent at any time from Settings without affecting prior lawful processing.'
    ],
    antiDiscriminationPledge: 'NivasPay rigorously prohibits discrimination based on religion, caste, gender, or marital status in line with Article 15 of the Constitution of India and Fair Housing guidelines. Owners violating this face immediate account suspension.',
    minorsNotice: 'Per Section 9 of the DPDP Act 2023, individuals under 18 years of age are not permitted to register without verifiable parental consent.'
  },
  hi: {
    title: 'डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम, 2023 की धारा 5 के अंतर्गत सूचना',
    version: 'DPDP-2023-v2.4-HI',
    summary: 'निवासपे (NivasPay) डेटा फिड्यूशरी के रूप में कार्य करता है। हम आपके किराये के आवेदन को संसाधित करने हेतु केवल न्यूनतम आवश्यक डेटा एकत्र करते हैं।',
    purposes: [
      {
        title: 'आवेदन सत्यापन एवं पात्रता',
        dataItems: 'नाम, आयु, लिंग, व्यवसाय, परिवार के सदस्यों की संख्या, पालतू पशु विवरण',
        retention: 'आवेदन निर्णय के 90 दिनों तक या खाता मिटाने के अनुरोध तक सुरक्षित।',
        reason: 'मकान मालिक के वस्तुनिष्ठ नियमों (अधिकतम सदस्य, पालतू जानवर) के अनुसार पात्रता जांचने के लिए।'
      },
      {
        title: 'संवेदनशील डेटा (धर्म एवं जनजाति)',
        dataItems: 'धर्म, जनजाति पहचान (पूर्णतः वैकल्पिक)',
        retention: 'आवेदन समाप्ति पर तुरंत या अधिकतम 14 दिनों के भीतर नष्ट कर दिया जाता है।',
        reason: 'पूर्णतः स्वैच्छिक। यह डेटा कभी भी मकान मालिक को तब तक नहीं दिखाया जाता जब तक आप स्पष्ट सहमति न दें। इसका उपयोग किसी भी फ़िल्टर में नहीं होता।'
      },
      {
        title: 'भुगतान प्रसंस्करण (RBI और जीएसटी अनुपालन)',
        dataItems: 'फ़ोन नंबर, UPI VPA, लेन-देन आईडी, जीएसटी बिलिंग विवरण',
        retention: 'आरबीआई और जीएसटी कानूनों के तहत 7 वर्षों के लिए अनिवार्य रूप से सुरक्षित।',
        reason: '₹20 आवेदन शुल्क, स्वीकृति पर 10% ब्रोकरेज, और सुरक्षा जमा के निपटान हेतु।'
      }
    ],
    rights: [
      'डेटा एक्सेस का अधिकार: अपने सभी डेटा की प्रतिलिपि कभी भी डाउनलोड करें।',
      'सुधार का अधिकार: किसी भी गलत विवरण को तुरंत संशोधित करें।',
      'डेटा मिटाने का अधिकार (Right to Erasure): अपनी व्यक्तिगत जानकारी स्थायी रूप से हटाएं।',
      'शिकायत निवारण: हमारे नामित शिकायत अधिकारी से 48 घंटे में समाधान पाएं।',
      'सहमति वापस लेने का अधिकार: सेटिंग्स से कभी भी सहमति वापस लें।'
    ],
    antiDiscriminationPledge: 'निवासपे भारतीय संविधान के अनुच्छेद 15 और निष्पक्ष आवास दिशानिर्देशों के तहत धर्म, जाति या लिंग के आधार पर किसी भी भेदभाव को सख्ती से रोकता है। उल्लंघन करने वाले मकान मालिकों को तुरंत निलंबित किया जाता है।',
    minorsNotice: 'डीपीडीपी अधिनियम 2023 की धारा 9 के तहत, 18 वर्ष से कम आयु के अवयस्क माता-पिता की सहमति के बिना पंजीकरण नहीं कर सकते।'
  }
};
