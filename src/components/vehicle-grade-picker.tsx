"use client";

import { SearchPicker } from "@/components/search-picker";
import type { VehicleGrade } from "@/lib/vehicle-selection";

export function VehicleGradePicker({
  grades,
  selected,
  onSelect,
}: {
  grades: VehicleGrade[];
  selected: VehicleGrade | null;
  onSelect: (grade: VehicleGrade) => void;
}) {
  const generations = [
    ...new Map(grades.map((grade) => [grade.generationId, grade])).values(),
  ];
  const currentGrades = selected
    ? grades.filter((grade) => grade.generationId === selected.generationId)
    : [];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <SearchPicker
        label="世代・型式"
        placeholder="世代を選択"
        value={selected ? String(selected.generationId) : undefined}
        options={generations.map((grade) => ({
          id: String(grade.generationId),
          label: grade.generationName,
          description: grade.startYear
            ? `${grade.startYear}年〜${grade.endYear ? `${grade.endYear}年` : ""}`
            : undefined,
        }))}
        onSelect={(id) => {
          const grade = grades.find(
            (grade) => String(grade.generationId) === id,
          );
          if (grade) onSelect(grade);
        }}
      />
      <SearchPicker
        label="グレード・駆動方式"
        placeholder="グレードを選択"
        disabled={!selected}
        value={selected ? String(selected.trimId) : undefined}
        options={currentGrades.map((grade) => ({
          id: String(grade.trimId),
          label: `${grade.trimName} ${grade.driveType ?? ""}`,
          description: `${grade.phaseName} · 全高 ${grade.heightMm?.toLocaleString() ?? "不明"}mm / ${grade.weightKg?.toLocaleString() ?? "不明"}kg`,
        }))}
        onSelect={(id) => {
          const grade = currentGrades.find(
            (grade) => String(grade.trimId) === id,
          );
          if (grade) onSelect(grade);
        }}
      />
    </div>
  );
}
