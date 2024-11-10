import { LocalAccount } from "@/stores/account/types";
import { Grade } from "pawnote";
import { AverageOverview } from "../shared/Grade";
import uuid from "@/utils/uuid-v4";

export const saveIUTLanGrades = async (account: LocalAccount) => {
  try {
    const scodocData = account.identityProvider.rawData;
    const matieres = scodocData["relevé"].ressources;

    const gradesList: Grade[] = [];
    const averages: AverageOverview = {
      classOverall: {
        value: null,
        disabled: true,
      },
      overall: {
        value: null,
        disabled: true,
      },
      subjects: []
    };

    Object.keys(matieres).forEach((key) => {
      const matiere = matieres[key];
      const subjectName = matiere.titre + " > " + key;

      const subject = {
        id: uuid(),
        name: subjectName,
      };

      const grades: Grade[] = matiere.evaluations.map((note) => {
        const grade = {
          student: {
            value: parseInt(note.note.value),
            disabled: isNaN(parseInt(note.note.value)),
          },
          min: {
            value: parseInt(note.note.min),
            disabled: false,
          },
          max: {
            value: parseInt(note.note.max),
            disabled: false,
          },
          average: {
            value: parseInt(note.note.moy),
            disabled: false,
          },

          id: uuid(),
          outOf: {
            value: 20,
            disabled: false,
          },
          defaultOutOf: 20,
          description: note.description,
          timestamp: new Date(note.date).getTime(),
          subject: subject,
          coefficient: parseInt(note.coef),
          isOutOf20: true,

          isBonus: false,
          isOptional: false,

          subjectName: subject.name,
        };

        gradesList.push(grade);

        return grade;
      });

      const average = grades.reduce((acc, grade) => acc + grade.student.value, 0) / grades.length;
      const min = grades.reduce((acc, grade) => Math.min(acc, grade.min.value), 20);
      const max = grades.reduce((acc, grade) => Math.max(acc, grade.max.value), 0);
      const classAverage = grades.reduce((acc, grade) => acc + grade.average.value, 0) / grades.length;


      if (grades.length === 0) {
        return;
      }

      averages.subjects.push({
        classAverage: {
          value: classAverage,
          disabled: false,
        },
        color: "#888888",
        max: {
          value: max,
          disabled: false,
        },
        subjectName: subject.name,
        min: {
          value: min,
          disabled: false,
        },
        average: {
          value: average,
          disabled: false,
        },
        outOf: {
          value: 20,
          disabled: false,
        },
      });
    });

    return { grades: gradesList, averages: averages };
  }
  catch(e) {
    console.error(e);
  }
};