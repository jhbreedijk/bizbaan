/* Mail templates: 15 situations, three tones, Dutch and English. Placeholders fill in from the project.
   Warm and business use "u". Short is written for WhatsApp and uses "je". [Square brackets] are for him to fill in. */
'use strict';

const MAILS_VERSION = 2;
const MAIL_TONES = [['warm', 'Warm'], ['business', 'Business'], ['short', 'Short']];
const MAIL_SITUATIONS = [
  ['ack', 'Request received'], ['details', 'Ask for photos and sizes'], ['visit', 'Confirm a visit'],
  ['offer', 'Send the quote'], ['followup', 'Follow up the quote'], ['accepted', 'Thanks for the yes'],
  ['planning', 'Confirm the planning'], ['reminder', 'A week before the start'], ['change', 'Planning changed'],
  ['extra', 'Additional work'], ['update', 'Progress update'], ['invoice', 'Send an invoice'],
  ['payment', 'Payment reminder'], ['done', 'Finished, ask for a review'], ['decline', 'Say no politely'],
];

const SIGN = { nl: 'Met vriendelijke groet,\n{owner}', en: 'Kind regards,\n{owner}' };
const SIGN_CO = { nl: 'Met vriendelijke groet,\n{owner}\n{company}', en: 'Kind regards,\n{owner}\n{company}' };

// [situation]: { nl: { warm: [subject, body], business: [...], short: [...] }, en: {...} }
const MAIL_TEXTS = {
  ack: {
    nl: {
      warm: [`Uw aanvraag bij Bizbaan`, `Beste {client},\n\nBedankt voor uw aanvraag. Ik heb hem goed ontvangen en kijk er met plezier naar.\n\nOm een goede inschatting te maken bel ik u graag even. Op welk nummer en wanneer kan ik u het beste bereiken?\n\n${SIGN_CO.nl}`],
      business: [`Ontvangstbevestiging aanvraag`, `Geachte {client},\n\nHierbij bevestig ik de ontvangst van uw aanvraag. Binnen twee werkdagen neem ik contact met u op om de details door te nemen.\n\n${SIGN_CO.nl}`],
      short: [`Aanvraag ontvangen`, `Hoi {client}, dank voor je aanvraag! Wanneer kan ik je even bellen? Groet, {owner} (Bizbaan)`],
    },
    en: {
      warm: [`Your request to Bizbaan`, `Dear {client},\n\nThank you for your request. It arrived safely and I am looking forward to it.\n\nTo give you a good estimate I would like to call you briefly. Which number, and what time suits you best?\n\n${SIGN_CO.en}`],
      business: [`Request received`, `Dear {client},\n\nThis confirms we received your request. I will contact you within two working days to go through the details.\n\n${SIGN_CO.en}`],
      short: [`Request received`, `Hi {client}, thanks for your request! When can I give you a quick call? {owner}, Bizbaan`],
    },
  },
  details: {
    nl: {
      warm: [`Nog een paar vragen over uw project`, `Beste {client},\n\nFijn dat we elkaar spraken. Om de prijs goed te maken heb ik nog een paar dingen nodig:\n\n- foto's van de ruimtes, graag met een meetlint in beeld\n- de maten in m² per ruimte, als u die heeft\n- welke materialen u al gekozen heeft, of waar u advies bij wilt\n\nU mag het gewoon terugsturen op deze mail of via WhatsApp. Daarna maak ik de offerte.\n\n${SIGN.nl}`],
      business: [`Aanvullende informatie voor uw offerte`, `Geachte {client},\n\nVoor een nauwkeurige offerte ontvang ik graag:\n\n- foto's van de betreffende ruimtes\n- de afmetingen per ruimte\n- uw materiaalkeuze, indien bekend\n\nNa ontvangst stel ik de offerte op.\n\n${SIGN_CO.nl}`],
      short: [`Foto's en maten`, `Hoi {client}, kun je me foto's sturen van de ruimtes, met een meetlint erbij? Dan maak ik de offerte. Dank! {owner}`],
    },
    en: {
      warm: [`A few more questions about your project`, `Dear {client},\n\nGood talking to you. To get the price right I need a few more things:\n\n- photos of the rooms, ideally with a tape measure in view\n- the size of each room in m², if you have them\n- the materials you already chose, or where you would like advice\n\nJust reply to this mail or send them by WhatsApp. Then I will make the quote.\n\n${SIGN.en}`],
      business: [`Information needed for your quote`, `Dear {client},\n\nFor an accurate quote I would like to receive:\n\n- photos of the rooms involved\n- the dimensions of each room\n- your choice of materials, if known\n\nOnce received, I will prepare the quote.\n\n${SIGN_CO.en}`],
      short: [`Photos and sizes`, `Hi {client}, could you send me photos of the rooms with a tape measure in view? Then I'll make the quote. Thanks! {owner}`],
    },
  },
  visit: {
    nl: {
      warm: [`Afspraak bij u thuis`, `Beste {client},\n\nWat fijn dat ik even langs mag komen. Zoals afgesproken kom ik op [dag en tijd] naar {address}.\n\nIk kijk naar de ruimtes, meet alles op en neem uw wensen met u door. Reken op ongeveer een uur.\n\nTot dan,\n{owner}`],
      business: [`Bevestiging afspraak`, `Geachte {client},\n\nHierbij bevestig ik onze afspraak op [dag en tijd] op {address}. Tijdens het bezoek neem ik de maten op en bespreken we de werkzaamheden. Duur: circa een uur.\n\n${SIGN_CO.nl}`],
      short: [`Afspraak`, `Hoi {client}, top, ik kom [dag en tijd] langs op {address}. Tot dan! {owner}`],
    },
    en: {
      warm: [`My visit to your home`, `Dear {client},\n\nThank you for having me over. As agreed, I will come to {address} on [day and time].\n\nI will look at the rooms, measure everything and go through your wishes with you. It takes about an hour.\n\nSee you then,\n{owner}`],
      business: [`Appointment confirmed`, `Dear {client},\n\nThis confirms our appointment on [day and time] at {address}. During the visit I will take measurements and discuss the work. Duration: about one hour.\n\n${SIGN_CO.en}`],
      short: [`Appointment`, `Hi {client}, great, I'll come by on [day and time] at {address}. See you then! {owner}`],
    },
  },
  offer: {
    nl: {
      warm: [`Uw offerte {offer}`, `Beste {client},\n\nZoals beloofd stuur ik u hierbij de offerte voor {address}. Het totaal is {total} inclusief btw.\n\nIk heb alles zo duidelijk mogelijk opgeschreven, met de planning erbij. Heeft u vragen, of wilt u iets aanpassen? Bel of app me gerust.\n\n${SIGN.nl}`],
      business: [`Offerte {offer}`, `Geachte {client},\n\nIn de bijlage vindt u offerte {offer} voor de werkzaamheden aan {address}, totaal {total} inclusief btw.\n\nDe offerte is 30 dagen geldig. Ik hoor graag of u akkoord gaat.\n\n${SIGN_CO.nl}`],
      short: [`Offerte`, `Hoi {client}, de offerte staat in je mail: {total} incl. btw. Vragen? Bel of app me gerust. {owner}`],
    },
    en: {
      warm: [`Your quote {offer}`, `Dear {client},\n\nAs promised, here is the quote for {address}. The total is {total} including VAT.\n\nI wrote everything down as clearly as I could, with the planning included. Any questions, or something you would like to change? Call or message me any time.\n\n${SIGN.en}`],
      business: [`Quote {offer}`, `Dear {client},\n\nPlease find attached quote {offer} for the work at {address}, total {total} including VAT.\n\nThe quote is valid for 30 days. I look forward to hearing whether you agree.\n\n${SIGN_CO.en}`],
      short: [`Quote`, `Hi {client}, the quote is in your inbox: {total} incl. VAT. Questions? Call or message me any time. {owner}`],
    },
  },
  followup: {
    nl: {
      warm: [`Even een vraag over de offerte`, `Beste {client},\n\nIk stuurde u onlangs de offerte voor {address}. Ik ben benieuwd wat u ervan vindt.\n\nZijn er nog vragen, of wilt u iets anders? Dan pas ik het graag aan. Een kort belletje mag ook altijd.\n\n${SIGN.nl}`],
      business: [`Opvolging offerte {offer}`, `Geachte {client},\n\nGraag verneem ik of u offerte {offer} heeft kunnen bekijken en of u akkoord gaat. Voor vragen ben ik bereikbaar op {phone}.\n\n${SIGN_CO.nl}`],
      short: [`Offerte`, `Hoi {client}, heb je de offerte kunnen bekijken? Laat maar weten als je vragen hebt. {owner}`],
    },
    en: {
      warm: [`A quick question about the quote`, `Dear {client},\n\nI recently sent you the quote for {address}, and I am curious what you think.\n\nAny questions, or would you like something different? I am happy to adjust it. A short call is always fine too.\n\n${SIGN.en}`],
      business: [`Follow-up on quote {offer}`, `Dear {client},\n\nCould you let me know whether you have reviewed quote {offer} and whether you agree? I can be reached on {phone} for any questions.\n\n${SIGN_CO.en}`],
      short: [`Quote`, `Hi {client}, did you get a chance to look at the quote? Let me know if you have questions. {owner}`],
    },
  },
  accepted: {
    nl: {
      warm: [`Wat fijn, we gaan beginnen`, `Beste {client},\n\nDank u wel voor uw vertrouwen. Ik heb er zin in.\n\nDe volgende stappen: u ontvangt een kleine aanbetaling van 1% en daarna de overeenkomst. Met 5% bij het tekenen leggen we de startdatum vast. Daarna hoort u de planning van mij.\n\nMet hartelijke groet,\n{owner}`],
      business: [`Bevestiging opdracht`, `Geachte {client},\n\nHartelijk dank voor uw akkoord op offerte {offer}. U ontvangt binnenkort de factuur voor de aanbetaling van 1% en de overeenkomst. Na ondertekening en betaling van 5% leggen we de startdatum vast.\n\n${SIGN_CO.nl}`],
      short: [`Akkoord`, `Top {client}, dank je! Je krijgt eerst de aanbetaling en de overeenkomst, daarna plannen we de start. {owner}`],
    },
    en: {
      warm: [`Wonderful, let's get started`, `Dear {client},\n\nThank you for your trust. I am looking forward to it.\n\nNext steps: you will receive a small deposit invoice of 1%, followed by the agreement. With 5% at signing we fix the start date. Then you will hear the planning from me.\n\nWarm regards,\n{owner}`],
      business: [`Order confirmation`, `Dear {client},\n\nThank you for accepting quote {offer}. You will shortly receive the invoice for the 1% deposit and the agreement. After signing and payment of 5% we will fix the start date.\n\n${SIGN_CO.en}`],
      short: [`Agreed`, `Great {client}, thank you! First the deposit and the agreement, then we plan the start. {owner}`],
    },
  },
  planning: {
    nl: {
      warm: [`We starten op {start}`, `Beste {client},\n\nDe planning staat. We beginnen op {start} en verwachten op {end} klaar te zijn, ongeveer {weeks} weken.\n\nEen paar dagen van tevoren laat ik u weten hoe laat we komen en wat we van u nodig hebben, zoals sleutels en een plek voor het materiaal.\n\n${SIGN.nl}`],
      business: [`Planning werkzaamheden`, `Geachte {client},\n\nDe werkzaamheden starten op {start} en worden naar verwachting op {end} afgerond ({weeks} weken).\n\nIk informeer u vooraf over de aankomsttijd en wat wij van u nodig hebben.\n\n${SIGN_CO.nl}`],
      short: [`Planning`, `Hoi {client}, we beginnen {start} en zijn klaar rond {end}. Ik laat je vooraf weten hoe laat we komen. {owner}`],
    },
    en: {
      warm: [`We start on {start}`, `Dear {client},\n\nThe planning is set. We start on {start} and expect to finish on {end}, about {weeks} weeks.\n\nA few days before, I will let you know what time we arrive and what we need from you, such as keys and a spot for the materials.\n\n${SIGN.en}`],
      business: [`Planning of the work`, `Dear {client},\n\nThe work starts on {start} and is expected to be completed on {end} ({weeks} weeks).\n\nI will inform you in advance about our arrival time and what we need from you.\n\n${SIGN_CO.en}`],
      short: [`Planning`, `Hi {client}, we start {start} and should be done around {end}. I'll let you know our arrival time beforehand. {owner}`],
    },
  },
  reminder: {
    nl: {
      warm: [`Volgende week beginnen we`, `Beste {client},\n\nOp {start} beginnen we. Een paar dingen die ons helpen:\n\n- maak de ruimtes zo leeg mogelijk, of laat weten wat er moet blijven staan\n- regel een sleutel of iemand die ons de eerste ochtend binnenlaat\n- laat de buren of de VvE weten dat we komen\n\nWe zijn er rond [tijd]. Tot volgende week!\n\n${SIGN.nl}`],
      business: [`Voorbereiding start {start}`, `Geachte {client},\n\nOp {start} starten de werkzaamheden. Wij verzoeken u de ruimtes vrij te maken, de toegang te regelen en eventueel de VvE te informeren. Aankomst: [tijd].\n\n${SIGN_CO.nl}`],
      short: [`Volgende week`, `Hoi {client}, {start} beginnen we! Wil je de ruimtes leeg maken en de sleutel regelen? We zijn er rond [tijd]. {owner}`],
    },
    en: {
      warm: [`We start next week`, `Dear {client},\n\nOn {start} we begin. A few things that help us:\n\n- clear the rooms as much as possible, or tell us what should stay\n- arrange a key, or someone to let us in on the first morning\n- let the neighbours or the building association know we are coming\n\nWe arrive around [time]. See you next week!\n\n${SIGN.en}`],
      business: [`Preparing for the start on {start}`, `Dear {client},\n\nThe work starts on {start}. Please clear the rooms, arrange access and, if needed, inform the building association. Arrival: [time].\n\n${SIGN_CO.en}`],
      short: [`Next week`, `Hi {client}, we start {start}! Could you clear the rooms and sort out a key? We'll be there around [time]. {owner}`],
    },
  },
  change: {
    nl: {
      warm: [`Wijziging in de planning`, `Beste {client},\n\nEr is iets veranderd in de planning, en dat laat ik u meteen weten. We zijn nu klaar op {end}.\n\n{change}\n\nVerandert dit ook iets aan de prijs, dan hoort u dat altijd eerst van mij. Bel me gerust als u vragen heeft.\n\n${SIGN.nl}`],
      business: [`Wijziging planning`, `Geachte {client},\n\nDe planning is gewijzigd. De nieuwe einddatum is {end}.\n\n{change}\n\nEventuele gevolgen voor de prijs bespreek ik vooraf met u.\n\n${SIGN_CO.nl}`],
      short: [`Planning`, `Hoi {client}, even een update: we zijn nu klaar op {end}. {change} Bel me gerust. {owner}`],
    },
    en: {
      warm: [`A change in the planning`, `Dear {client},\n\nSomething changed in the planning, and I want you to hear it straight away. We now finish on {end}.\n\n{change}\n\nIf this changes the price as well, you will always hear it from me first. Call me any time with questions.\n\n${SIGN.en}`],
      business: [`Planning change`, `Dear {client},\n\nThe planning has changed. The new completion date is {end}.\n\n{change}\n\nAny effect on the price will be discussed with you beforehand.\n\n${SIGN_CO.en}`],
      short: [`Planning`, `Hi {client}, quick update: we now finish on {end}. {change} Call me any time. {owner}`],
    },
  },
  extra: {
    nl: {
      warm: [`Extra werk: even overleggen`, `Beste {client},\n\nTijdens het werk kwamen we iets tegen dat ik u wil voorleggen:\n\n[wat en waarom]\n\nDit kost [bedrag] extra, inclusief btw. Ik ga pas verder als u akkoord bent. Bel me gerust als u het liever even bespreekt.\n\n${SIGN.nl}`],
      business: [`Meerwerk ter goedkeuring`, `Geachte {client},\n\nHierbij leg ik het volgende meerwerk ter goedkeuring voor:\n\n[omschrijving]\n\nKosten: [bedrag] inclusief btw. Wij voeren dit uit na uw akkoord.\n\n${SIGN_CO.nl}`],
      short: [`Extra werk`, `Hoi {client}, we kwamen [wat] tegen. Oplossen kost [bedrag] incl. btw. Akkoord? Dan pakken we het meteen op. {owner}`],
    },
    en: {
      warm: [`Extra work: let's talk`, `Dear {client},\n\nDuring the work we came across something I want to run by you:\n\n[what and why]\n\nIt costs [amount] extra, including VAT. I only continue once you agree. Feel free to call if you would rather talk it through.\n\n${SIGN.en}`],
      business: [`Additional work for approval`, `Dear {client},\n\nI hereby submit the following additional work for your approval:\n\n[description]\n\nCost: [amount] including VAT. We carry this out after your approval.\n\n${SIGN_CO.en}`],
      short: [`Extra work`, `Hi {client}, we found [what]. Fixing it costs [amount] incl. VAT. OK? Then we'll do it right away. {owner}`],
    },
  },
  update: {
    nl: {
      warm: [`Hoe het gaat bij u thuis`, `Beste {client},\n\nEven een update van de bouw. [Wat er deze week gebeurd is.]\n\nVolgende week staat [wat er komt] op het programma. We liggen op schema voor {end}.\n\n${SIGN.nl}`],
      business: [`Voortgang werkzaamheden`, `Geachte {client},\n\nVoortgang: [stand van zaken]. Volgende stap: [planning]. De verwachte oplevering blijft {end}.\n\n${SIGN_CO.nl}`],
      short: [`Update`, `Hoi {client}, update: [wat]. Volgende week [wat komt]. Alles op schema! {owner}`],
    },
    en: {
      warm: [`How things are going at your home`, `Dear {client},\n\nA quick update from the site. [What happened this week.]\n\nNext week [what comes next] is on the schedule. We are on track for {end}.\n\n${SIGN.en}`],
      business: [`Progress of the work`, `Dear {client},\n\nProgress: [status]. Next step: [planning]. Expected completion remains {end}.\n\n${SIGN_CO.en}`],
      short: [`Update`, `Hi {client}, update: [what]. Next week [what's next]. All on schedule! {owner}`],
    },
  },
  invoice: {
    nl: {
      warm: [`Factuur {invoice}`, `Beste {client},\n\nHierbij factuur {invoice} van {amount}. U vindt hem in de bijlage.\n\nDank u wel, en tot snel.\n\n${SIGN.nl}`],
      business: [`Factuur {invoice}`, `Geachte {client},\n\nIn de bijlage vindt u factuur {invoice} ter hoogte van {amount}. Wij verzoeken u het bedrag binnen 14 dagen over te maken.\n\n${SIGN_CO.nl}`],
      short: [`Factuur`, `Hoi {client}, factuur {invoice} ({amount}) staat in je mail. Dank je! {owner}`],
    },
    en: {
      warm: [`Invoice {invoice}`, `Dear {client},\n\nPlease find invoice {invoice} for {amount} attached.\n\nThank you, and see you soon.\n\n${SIGN.en}`],
      business: [`Invoice {invoice}`, `Dear {client},\n\nAttached is invoice {invoice} for {amount}. Please transfer the amount within 14 days.\n\n${SIGN_CO.en}`],
      short: [`Invoice`, `Hi {client}, invoice {invoice} ({amount}) is in your inbox. Thanks! {owner}`],
    },
  },
  payment: {
    nl: {
      warm: [`Een vriendelijke herinnering`, `Beste {client},\n\nMisschien is het u ontschoten: factuur {invoice} van {amount} staat nog open. Zou u hem willen overmaken? Is er iets onduidelijk, laat het me gerust weten.\n\n${SIGN.nl}`],
      business: [`Betalingsherinnering factuur {invoice}`, `Geachte {client},\n\nVolgens onze administratie is factuur {invoice} van {amount} nog niet voldaan. Wij verzoeken u het bedrag binnen 7 dagen over te maken. Heeft u inmiddels betaald, dan kunt u deze herinnering als niet verzonden beschouwen.\n\n${SIGN_CO.nl}`],
      short: [`Factuur`, `Hoi {client}, factuur {invoice} ({amount}) staat nog open. Wil je hem overmaken? Dank! {owner}`],
    },
    en: {
      warm: [`A friendly reminder`, `Dear {client},\n\nIt may have slipped your mind: invoice {invoice} for {amount} is still open. Would you transfer it? If anything is unclear, just let me know.\n\n${SIGN.en}`],
      business: [`Payment reminder for invoice {invoice}`, `Dear {client},\n\nAccording to our records, invoice {invoice} for {amount} has not been paid yet. Please transfer the amount within 7 days. If you have already paid, please disregard this reminder.\n\n${SIGN_CO.en}`],
      short: [`Invoice`, `Hi {client}, invoice {invoice} ({amount}) is still open. Could you transfer it? Thanks! {owner}`],
    },
  },
  done: {
    nl: {
      warm: [`Bedankt, en een kleine vraag`, `Beste {client},\n\nHet werk aan {address} is klaar. Bedankt voor uw vertrouwen en de fijne samenwerking.\n\nZou u een paar woorden over ons willen schrijven? Voor een klein bedrijf als het onze maakt dat echt verschil: {review}\n\nMet hartelijke groet,\n{owner}`],
      business: [`Oplevering {address}`, `Geachte {client},\n\nDe werkzaamheden aan {address} zijn afgerond. Hartelijk dank voor de prettige samenwerking. Uw beoordeling stellen wij zeer op prijs: {review}\n\n${SIGN_CO.nl}`],
      short: [`Klaar!`, `Hoi {client}, alles is klaar. Dank je wel! Zou je een korte review willen schrijven? {review} {owner}`],
    },
    en: {
      warm: [`Thank you, and a small favour`, `Dear {client},\n\nThe work at {address} is finished. Thank you for your trust and the good cooperation.\n\nWould you write a few words about us? For a small company like ours it really makes a difference: {review}\n\nWarm regards,\n{owner}`],
      business: [`Completion at {address}`, `Dear {client},\n\nThe work at {address} has been completed. Thank you for the pleasant cooperation. We would greatly appreciate your review: {review}\n\n${SIGN_CO.en}`],
      short: [`All done!`, `Hi {client}, everything is finished. Thank you! Would you write a short review? {review} {owner}`],
    },
  },
  decline: {
    nl: {
      warm: [`Uw aanvraag`, `Beste {client},\n\nDank u wel voor uw aanvraag. Helaas lukt het mij niet om uw project in de gewenste periode goed op te pakken, en ik wil u niet half helpen.\n\nIk wens u veel succes, en mocht het later wel passen, dan hoor ik het graag.\n\n${SIGN.nl}`],
      business: [`Reactie op uw aanvraag`, `Geachte {client},\n\nHartelijk dank voor uw aanvraag. Helaas kunnen wij deze opdracht op dit moment niet aannemen vanwege onze planning. Wij wensen u veel succes met uw project.\n\n${SIGN_CO.nl}`],
      short: [`Aanvraag`, `Hoi {client}, dank voor je aanvraag. Helaas past het nu niet in mijn planning. Succes met je project! {owner}`],
    },
    en: {
      warm: [`Your request`, `Dear {client},\n\nThank you for your request. Unfortunately I cannot take on your project properly in the period you want, and I do not want to help you halfway.\n\nI wish you every success, and if the timing works later, I would love to hear from you.\n\n${SIGN.en}`],
      business: [`Regarding your request`, `Dear {client},\n\nThank you for your request. Unfortunately we cannot accept this assignment at this time due to our schedule. We wish you every success with your project.\n\n${SIGN_CO.en}`],
      short: [`Your request`, `Hi {client}, thanks for your request. Sadly it doesn't fit my planning right now. Good luck with your project! {owner}`],
    },
  },
};

/** The full list he starts with: one template per situation, tone and language. */
function buildMails() {
  const out = [];
  for (const [sit, name] of MAIL_SITUATIONS) for (const lang of ['nl', 'en']) for (const [tone] of MAIL_TONES) {
    const [subject, body] = MAIL_TEXTS[sit][lang][tone];
    out.push({ id: `${sit}-${lang}-${tone}`, sit, lang, tone, name, subject, body });
  }
  return out;
}
