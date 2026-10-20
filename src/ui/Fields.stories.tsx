import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field, Input, Select, Textarea } from "./Field";
import { Checkbox, ChoiceCard, Radio, Switch } from "./Choice";
import { useState } from "react";

const meta = { title: "Primitives/Form controls" } satisfies Meta;
export default meta;
type S = StoryObj;

export const TextFields: S = {
  render: () => (
    <div className="grid max-w-xl gap-4 sm:grid-cols-2">
      <Field label="Full name" required>{(p) => <Input {...p} placeholder="Ramesh Shrestha" />}</Field>
      <Field label="Phone" hint="98XXXXXXXX">{(p) => <Input {...p} inputMode="tel" />}</Field>
      <Field label="Email" error="Enter a valid email">{(p) => <Input {...p} type="email" defaultValue="nope" />}</Field>
      <Field label="District">{(p) => <Select {...p}><option>Kathmandu</option><option>Lalitpur</option></Select>}</Field>
      <Field label="Disabled">{(p) => <Input {...p} disabled defaultValue="locked" />}</Field>
      <Field label="Note" className="sm:col-span-2">{(p) => <Textarea {...p} />}</Field>
    </div>
  ),
};

export const Nepali: S = {
  render: () => (
    <div className="max-w-md space-y-4" lang="ne">
      <Field label="पूरा नाम" required>{(p) => <Input {...p} defaultValue="रमेश श्रेष्ठ" />}</Field>
      <Field label="ठेगाना" error="ठेगाना आवश्यक छ">{(p) => <Input {...p} />}</Field>
    </div>
  ),
};

export const Choices: S = {
  render: function Render() {
    const [on, setOn] = useState(true);
    const [pay, setPay] = useState("cod");
    return (
      <div className="max-w-xl space-y-3">
        <Checkbox label="Save this address" description="Use it next time" defaultChecked />
        <Radio name="r" label="Home" defaultChecked />
        <Radio name="r" label="Office" />
        <Switch checked={on} onCheckedChange={setOn} label="Order notifications" />
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceCard name="pay" checked={pay === "cod"} onChange={() => setPay("cod")} label="Cash on delivery" description="Pay the rider" />
          <ChoiceCard name="pay" checked={pay === "manual"} onChange={() => setPay("manual")} label="eSewa / bank transfer" description="Upload the receipt" />
        </div>
      </div>
    );
  },
};
