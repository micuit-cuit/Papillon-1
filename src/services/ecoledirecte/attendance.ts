import ecoledirecte, {AttendanceItem, AttendanceItemKind} from "pawdirecte";
import type { EcoleDirecteAccount } from "@/stores/account/types";
import { ErrorServiceUnauthenticated } from "../shared/errors";
import type { Attendance } from "../shared/Attendance";
import {dateStringAsTimeInterval, getDuration} from "@/services/ecoledirecte/time-interval";
import {Punishment} from "@/services/shared/Punishment";
import {Absence} from "@/services/shared/Absence";
import {Delay} from "@/services/shared/Delay";

const decodeDelay = (item: AttendanceItem): Delay => {
  const timeInterval = dateStringAsTimeInterval(item.displayDate);
  const duration = (timeInterval?.end && timeInterval.start) ? getDuration(timeInterval).getTime() / (60 * 1000): 0;
  return {
    id: item.id.toString(),
    timestamp: new Date(timeInterval?.start || item.date).getTime(),
    duration: duration,
    justified: item.justified,
    justification: item.comment,
    reasons: item.reason ?? void 0,
  };
};

const decodeAbsence = (item: AttendanceItem): Absence => {
  const timeInterval = dateStringAsTimeInterval(item.displayDate);
  const duration = (timeInterval?.end && timeInterval.start) ? getDuration(timeInterval): new Date();
  const fromTimestamp = timeInterval?.start ? new Date(timeInterval.start).getTime(): 0;
  const toTimestamp = timeInterval?.end ? new Date(timeInterval.end).getTime(): 0;
  return {
    id: item.id.toString(),
    fromTimestamp,
    toTimestamp,
    justified: item.justified,
    hours: duration.getHours() + "h" + duration.getMinutes(),
    administrativelyFixed: item.justified,
    reasons: item.reason,
  };
};


const decodePunishment = (item: AttendanceItem): Punishment => {
  const timeInterval = dateStringAsTimeInterval(item.displayDate);
  const duration = (timeInterval?.end && timeInterval.start) ? getDuration(timeInterval) .getTime() / (60 * 1000): 0;
  return {
    id: item.id.toString(),
    duration,
    givenBy: item.teacher,
    timestamp: item.date.getTime(),
    // TODO
    duringLesson: false,
    exclusion: false,
    homework: {
      documents: [],
      text: ""
    },
    nature: "",
    reason: {
      circumstances: item.reason,
      documents: [],
      text: []
    },
    schedulable: false,
    schedule: []
  };
};

export const getAttendance = async (
  account: EcoleDirecteAccount,
): Promise<Attendance> => {
  if (!account.authentication.session)
    throw new ErrorServiceUnauthenticated("ecoledirecte");
  const attendance = await ecoledirecte.studentAttendance(
    account.authentication.session,
    account.authentication.account,
  );

  const delays = attendance.absences
    .filter((a) => a.kind === AttendanceItemKind.RETARD)
    .map(decodeDelay);
  const absences = attendance.absences
    .filter((a) => a.kind === AttendanceItemKind.ABSENCE)
    .map(decodeAbsence);
  const punishments = attendance.punishments
    .filter((a) => a.kind === AttendanceItemKind.PUNITION)
    .map(decodePunishment);

  return {
    punishments,
    absences,
    delays,
    observations: [],
  };
};
