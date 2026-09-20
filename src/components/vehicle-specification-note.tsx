import type { VehicleGrade } from "@/lib/vehicle-selection";

export function VehicleSpecificationNote({ grade }: { grade: VehicleGrade }) {
  return (
    <div className="mt-3 text-xs leading-6 text-muted-foreground">
      <p>{grade.specificationNote || "登録された代表的な仕様です。年式・定員・装備により寸法や重量が異なるため、車検証やお車の諸元表と照合してください。"}</p>
      {grade.sourceUrl && (
        <a className="font-medium text-primary underline underline-offset-4" href={grade.sourceUrl} target="_blank" rel="noopener noreferrer">メーカーの参照資料（対象条件は上記を確認）</a>
      )}
    </div>
  );
}
