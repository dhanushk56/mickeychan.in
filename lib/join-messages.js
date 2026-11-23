import { deleteRecord, listRecords, saveRecord } from "@/lib/record-store";

const JOIN_MESSAGES_KEY = "submissions:join";

function recordsKey() {
  return `${JOIN_MESSAGES_KEY}:records`;
}

export function listJoinMessages() {
  return listRecords(JOIN_MESSAGES_KEY, recordsKey());
}

export function addJoinMessage(message) {
  return saveRecord(recordsKey(), message.id, message);
}

export function deleteJoinMessage(id) {
  return deleteRecord(recordsKey(), id);
}
