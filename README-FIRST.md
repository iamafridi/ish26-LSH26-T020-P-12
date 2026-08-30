# Sample data for every problem

`fixtures/` holds one JSON file per problem (P01 to P12). Each file has a `format_note` describing the fields and a
`cases` list of 25 sample cases in that shape. `fixture-index.json` maps problem ids to files.

Your app must be able to take the values in these files, either by loading the file or by typing them in.
Judges will test with cases in the same shape after submission closes at 10:00 PM, some of them not published here.

Read `CLARIFICATIONS.md` and `SUBMISSION-GUIDE.md`: they settle problem-specific questions and state the repository,
submission, originality, deadline and early-bonus rules. Judges mark by them.

Create one completed `evaluation-manifest.json` in each repository from `evaluation-manifest.template.json`.
Also add `EVENT.md` from its template and `LICENSES.md` from its template. The manifest intentionally does not ask
for its own commit SHA or the Form receipt time; those are captured by the organizer's submission record.
The problem statements are in the DOCX beside this file.
