import { useState } from "react";
import FlightSegmentForm from "@/components/proposal/FlightSegmentForm";

export default function BaggagePreview() {
  const [seg, setSeg] = useState<any>({
    airline: "LA",
    airline_name: "LATAM",
    flight_number: "8064",
    origin_iata: "GRU",
    destination_iata: "MAD",
    departure_date: "2026-09-10",
    departure_time: "22:10",
    arrival_time: "12:30",
    duration_minutes: 620,
    terminal: "3",
    arrival_terminal: "4S",
    aircraft_type: "Boeing 787-9",
    cabin_class: "Econômica",
    personal_item_included: true,
    personal_item_weight_kg: 10,
    carry_on_included: true,
    carry_on_weight_kg: 10,
    checked_bags_included: 2,
    checked_bag_weight_kg: 23,
    baggage_notes: "",
    notes: "",
  });
  return (
    <div className="p-4 max-w-[460px]">
      <FlightSegmentForm
        seg={seg}
        onUpdate={(f, v) => setSeg((s: any) => ({ ...s, [f]: v }))}
        onUpdateMulti={(u) => setSeg((s: any) => ({ ...s, ...u }))}
      />
    </div>
  );
}
