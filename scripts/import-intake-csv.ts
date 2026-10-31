import fs from "fs";
import path from "path";
import { importIntakeCsvToQueue } from "../src/lib/store";

async function main() {
  const args = process.argv.slice(2);
  let filePath = "";
  let rawRow = "";
  let source = "CLI Update-Intake Pass";
  let intakeDate = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      filePath = args[++i];
    } else if (args[i] === "--row" && args[i + 1]) {
      rawRow = args[++i];
    } else if (args[i] === "--source" && args[i + 1]) {
      source = args[++i];
    } else if (args[i] === "--date" && args[i + 1]) {
      intakeDate = args[++i];
    }
  }

  let csvContent = "";
  if (filePath) {
    const resolved = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    csvContent = fs.readFileSync(resolved, "utf8");
  } else if (rawRow) {
    csvContent = rawRow;
  } else {
    console.error(
      "Usage: npm run import:intake -- --file <path.csv> [--source <source>] [--date <YYYY-MM-DD>]"
    );
    process.exit(1);
  }

  const { importedNights, batch } = await importIntakeCsvToQueue({
    csvContent,
    source,
    intakeDate,
  });

  console.log("==========================================================");
  console.log("Mic Map — Update-Intake CSV Importer (Supabase Live DB)");
  console.log("==========================================================");
  console.log(`Batch ID:      ${batch.id}`);
  console.log(`Source:        ${batch.source}`);
  console.log(`Intake Date:   ${batch.intakeDate}`);
  console.log(`Rows Imported: ${importedNights.length} (all set to needs_verification)`);
  console.table(
    importedNights.map((n) => ({
      id: n.id,
      venueName: n.venueName,
      dayOfWeek: n.dayOfWeek,
      startTime: n.startTime,
      confidence: n.confidence,
      lastConfirmedText: n.lastConfirmedText,
    }))
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
