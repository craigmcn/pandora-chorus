# Project Brief

* Initial notes, 2026-10-01

## Decisions

Open questions and gaps are tracked in [Brief Review](Brief%20Review.md).

* 2026-10-01
  * **Platform:** installable web app (PWA) first, with store apps later only if needed.
  * **Background audio is a requirement:** playback, including moving to the next track in a loop, must continue when a phone or tablet sleeps or locks on its normal settings.
    * Test this early on a real iPhone, iPad and Android device. If the PWA can't do it reliably, wrap the app with Capacitor and a native audio plugin.
  * **Backend:** Supabase (database, auth, file storage).
  * **Login:** email magic link; primary and secondary addresses both work.
  * **Downloads:** members may download sheet music and practice tracks, so they can practise offline.

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
