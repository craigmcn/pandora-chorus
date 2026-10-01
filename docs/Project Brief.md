# Project Brief

* Initial notes, 2026-10-01

## Decisions

Decided 2026-10-01. Question numbers refer to the [Brief Review](Brief%20Review.md), which lists each question with its answer.

### MVP

* **Scope:** all four areas are in the MVP: the practice player and songs, members and login, the schedule, and news, FAQ and pages.
* **Timeline:** no fixed date.
* **Migration:** start fresh. The director uploads the current session's songs; nothing is imported from the old site.
* **Out of scope:** dues and payments (registration stays elsewhere), attendance and RSVPs, chat and messaging, and native store apps (unless the background-audio test fails).
* **Still open:** success criteria, i.e. what would show the director that this saves time.

### Platform and infrastructure

* **Platform (Q1):** installable web app (PWA) first, with store apps later only if needed.
* **Background audio is a requirement:** playback, including moving to the next track in a loop, must continue when a phone or tablet sleeps or locks on its normal settings.
  * Test this early on a real iPhone, iPad and Android device. If the PWA can't do it reliably, wrap the app with Capacitor and a native audio plugin.
* **Backend (Q5):** Supabase (database, auth, file storage).
* **Ownership (Q2):** Craig builds and maintains the site; all accounts (domain, Supabase, email) are in Craig's name.
* **Budget (Q3):** up to about $25+/month, which covers Supabase Pro.
* **Scale (Q4):** 40–80 members, 10–15 songs and 6–10 tracks per song per session.
* **Email domain (Q23):** buy a domain for the site and its email.
* **Accessibility (Q35):** WCAG 2.2 AA.

### Members and access

* **Login (Q6):** email magic link; primary and secondary addresses both work.
* **Privacy (Q8):** the choir is in Canada, so CASL applies to email and PIPEDA to personal data. The member directory is opt-in: each member chooses what other members can see.
* **Current members (Q9):** registration and dues happen elsewhere; the director then marks members active for the session.
* **Adding members (Q33):** the director pastes a list of emails.
* **Past members (Q10):** see public pages only until they rejoin.
* **Public pages (Q11):** landing, FAQ and standing instructions, news, and schedule. Everything else needs a login.
* **Profile edits (Q12):** a member can change their primary email after confirming the new address, and the director is notified. Section changes are requests that the director approves.
* **Admins (Q14):** the director, a co-admin as backup, and Craig as developer super-admin. The accompanist has no admin rights.

### Songs and practice player

* **Sections (Q15):** fixed Soprano, Alto, Tenor and Bass/Baritone. A song can split a section into numbered parts.
* **Parts (Q13):** members choose their part in the player; the app remembers the choice per song.
* **Song library (Q16):** songs live in a shared library, and each session picks songs from it.
* **Song files (Q21):** one sheet-music PDF and one lyrics sheet per song, plus practice tracks.
* **Uploads (Q31, Q32):** the director works mostly on a laptop. Dropping in a song's files tags each track's section and part from its filename, and the director confirms.
* **Loop order (Q19):** the director sets the song order; members can turn on shuffle.
* **Warm-ups (Q20):** flagged on the song, always excluded from the loop, and playable individually.
* **Missing part (Q27):** fall back to the section track, then All voices.
* **Controls (Q28):** repeat one song, playback speed and seek/skip. An A–B loop isn't in the MVP.
* **Display (Q29):** show the current song's sheet music or lyrics with a toggle; no page turns synced to the audio.
* **Downloads and offline (Q7, Q30):** downloads are allowed. A button saves the member's section for offline use, and tracks are also cached once they've been played.
* **Song notes (Q22):** when notes or errata change, the song shows an "Updated" badge; no email.

### Schedule

* **Agendas (Q17):** each rehearsal has "planned" and "what we covered" fields. Members see "covered" once it's filled in.
* **Events (Q18, Q34):** concerts include venue, call time and dress code. Weekly rehearsals are created for the whole session in one step. Events can be cancelled with a reason. Members can subscribe to a calendar (ICS) feed.

### News and email

* **Recipients (Q24):** news emails go to all current members, or to new members only (replacing the boilerplate onboarding emails).
* **Editor (Q25):** rich text with images and attachments.
* **Push notifications (Q26):** later, not in the MVP.

## Definitions

### The Pandora Chorus

Pandora Chorus is an indie pop/rock choir, in four-part harmony, with 2 sessions a year, running September to December and then January to May.

### Roles

* Director
  * directs rehearsals and performances
  * manages the communication process
  * manages the member list
* Accompanist
  * plays piano during rehearsals and performances
* Member
  * sings in either Soprano, Alto, Tenor or Bass/Baritone section
    * section are sometimes further arranged into multiple parts for intrasectional harmonies

## Current communication process

We have a web page with:

1. A schedule of upcoming rehearsals with a short agenda for each rehearsal
   1. The agenda is often filled in a day or two prior to the rehearsal
   2. The agenda is often replaced with a record of what was rehearsed, regardless of previous agenda
2. A list of songs the choir will be singing
   1. Title, original artist, arranger
   2. Notes about the song, the arrangement, or errata
   3. sheet music
   4. lyrics sheet
   5. practice tracks
      1. all voices
      2. soprano
      3. alto
      4. tenor
      5. bass/baritone
      6. Sometimes multiple section tracks for intrasectional harmonies

* The page requires a password, but no user name and with no access policy.
  * Anyone with the password can access the page.
  * The director emails a new password to the group at the beginning of each session.

* The director emails updates and information periodically to the members, including some boilerplate communications for all members, but targeted at new members.

## Problems to solve

* Boilerplate emails, communication
  * could be replaced with static information pages, FAQs
* Practice track playback
  * current looping is restricted to a song
  * better UX: allow looping by section (e.g., Soprano, Alto)
* Display lyrics sheet or sheet music while playing
  * UX: switch display when track changes
  * UX: switch between lyrics sheet and sheet music

## Requirements

1. A more complete website and companion mobile and tablet app intended for the Apple and Google Play stores.
   1. I don't know anything about app stores or native apps
2. Administration should be as simple as possible for a busy and somewhat non-technical director and mother.

* A basic landing page
* A current session page
  * Schedule
    * schedule administration
  * Practice tracks
* A "standing instructions" page
* Frequently asked questions, advice
* A news items page or section
  * Director can select to email the news item to members
* The director maintains an email list of current members
  * Only current members have access to the practice tracks.
    * Member profile should allow updating name, email and section, and allow for a secondary email address
  * List can include current and past members, with a "last active session" to determine current status
* Adding a new email address to the list sends a notification prompting the member to complete their profile
  * name, preferred name, pronouns, secondary email address
  * secondary email address will also allow access
    * flag to send emails also to secondary address

### Practice tracks

* Practice tracks are currently set in a song group, with playback looping through the all voices and each section.
  * A better user experience would be to select a section and loop through all songs for the section
* Some tracks are for warm-ups, and can be excluded from the play loop.
    
1. Director can create a list of songs
   1. set title, original artist, arranger
   2. free-form description
   3. upload sheet music, lyrics, and practice tracks
   4. set multiple related links (e.g., videos, artist website), with optional name
      1. "A live version of the artist playing the song: https://youtube.com/abcd123"
2. Member can select their section and loop all the tracks for their section
   * When multiple tracks exist for a section, the selection would allow (for example) Alto 1 or Soprano 2.
