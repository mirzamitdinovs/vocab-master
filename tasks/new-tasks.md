2. In Flashcards, add "Play Audio" button in the top where the pronunciation of Korean words are generated with ChatGPT and stored in the Google storage

3. Optimization: Fetch all data from the backend and store it in the session storage in the initial load and don't update it until anything changes

4. In Flashcards, the current progress should be saved after "End Session" is clicked to be able to come back to finish when there are many questions

5. Each korean word should have translations in 3 languages - Russian, Uzbek, English

6. In Flashcards, save everything in the Step 1 in local storage

THINGS TO FIX IN THE APP

1. Words Page:

- Fix: It's fetching words in <1s but users can see the fetching period
- Fix: Remove the card background layer. Remove the title and subtitle inside the card. Only 1 language is learned so put the text "Korean" on the top to be "Korean Words"
- Fix: Each Lesson dropdown is currently opening when clicked once, but taking 2 clicks to close
- Fix: Each Lesson's number, name, word count is being underlined when cliked. Add subtle background instead to mean active
- Fix: In Lesson card, generated lesson number and the actual lesson number differs because some lessons are divided into more parts

2. Cards Page:

- Fix: Remove Steps title and description inside the card
- Fix: Remove the card background layer

3. Session Page:

- Fix: Remove the card background layer
- Fix: Make the background color of the page to stay fixed and take whole page. It's currently moving up/down when moved
- Fix: Move the "End Session" button to top right to avoid the chance of clicking by mistake
- Fix: Add some kind of text or icon like "Tap word to flip" to explain how to go to the next/previous word inside the Word card
- Fix: When Session is started, remove the bottom navigation bar
- Fix: After the Session is ended, the table of Session Words appear. Currently, it's possible to scroll up/down inside the table, but when it reaches the bottom of the table, the scroll up functionality is not working and instead sending back to the Cards page

4. Quiz Page:

- Fix: Remove the card background layer
- Fix: The quiz questions are randomly shuffling even when going to check the Previous/Next question
- Fix: It's currently not possible to see which option has been selected. So, it should store the option chosen and add subtle background to mean it's selected when the user wants to go back/forward around the questions
- Fix: Make all questions mandatory so users can't skip questions without choosing one of the options. It's currently only waiting for the last question to be chosen to finish the quiz
- Fix: When only 2 questions are answered, it's only checking those questions in the Results table after submitting
- Fix: After clicking the End Quiz button, the table of Results appear. Remove the title and description from that screen
- Fix: Remove the card background layer in the Results table
- Fix: After the Quiz is ended, the table of Results appear. Currently, it's possible to scroll up/down inside the table, but it's also possible to update the page which sends back to the Quiz page

MY SUGGESTIONS

1. Outside App:

- New: Create a new app logo
- New: Choose a better app name
- New: Add preview image when the website link is shared

2. Best Words Page for me:

- New: Add List/Grid View button on top left
- New: Add Streak button on top right
- New: When clicked on Topic, it opens Lessons in a new page (list/grid view)
- New: Each Lesson card should have Lesson name and Word count in the left side. In the right, it should have 2 buttons: Play Audio icon, and Enter icon.
- New: Each Lesson table should open in its own page (no bottom navigation bar)

3. Best Cards Page for me:

- New: Remove Cards page and add Flashcard icon inside each Lesson card to practice that topic

4. Best Session Page for me:

- New: Each Lesson table should open in its own page (no bottom navigation bar)
- New: Title should be in the top middle of the screen
- New: A progress bar should be added below the title and should take the whole width of the screen while showing the current and last question number on both sides of the bar
- New: Below the Word card should be 2 big buttons: Tick and Cross icons to mean correct or incorrect

5. Best Quiz Page for me:

- New: It should have a screen to show the user is about to start a quiz
- New: When the Start Quiz button is selected, the quiz should start in it's own page (no bottom navigation bar)
- New: "End Quiz" button should always be visible so users can end the quiz any time they want. Maybe put this in top right to avoid the chance of clicking by mistake
- New: Title should be in the top middle of the screen
- New: A progress bar should be added below the title and should take the whole width of the screen while showing the current and last question number on both sides of the bar

6. Best Write Page for me:

- New: When the Write Session is started, it should open in it's own page (no bottom navigation bar)

7. Best Settings Page for me:

- New: It should have 3 default themes to be selected (Light/Dark/System)
- New: It should have Translations to be selected (Russian/Uzbek/English)
