"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type ManagedCategory = {
  id: string;
  industryId: string;
  name: string;
  prospectCount: number;
  clientCount: number;
  todayBusinesses: number;
  assignedInterns: number;
};

export type ManagedIndustry = {
  id: string;
  name: string;
  prospectCount: number;
  clientCount: number;
  categories: ManagedCategory[];
};

export type IndustryTeammate = {
  userId: string;
  name: string;
  email: string;
  jobTitle: string | null;
  industryId: string | null;
  industryName: string | null;
  clientCount: number;
};

export function IndustryManager({
  industries,
  teammates,
}: {
  industries: ManagedIndustry[];
  teammates: IndustryTeammate[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>(
    {}
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [savingUserId, setSavingUserId] = useState("");
  const [savingIndustryId, setSavingIndustryId] = useState("");

  const categories = useMemo(
    () =>
      industries
        .flatMap((industry) =>
          industry.categories.map((category) => ({
            ...category,
            industryName: industry.name,
          }))
        )
        .sort(
          (a, b) =>
            b.prospectCount - a.prospectCount || a.name.localeCompare(b.name)
        ),
    [industries]
  );
  const topIndustry = [...industries].sort(
    (a, b) => b.prospectCount - a.prospectCount
  )[0];
  const topCategory = categories[0];

  async function addIndustry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/industries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not add this industry.");
      setName("");
      setNotice(
        `${result.industry.name} added. Add six categories so assigned interns can start recording leads.`
      );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not add this industry."
      );
    } finally {
      setPending(false);
    }
  }

  async function addCategory(
    event: FormEvent<HTMLFormElement>,
    industryId: string
  ) {
    event.preventDefault();
    setSavingIndustryId(industryId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/industries/categories", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          industryId,
          name: categoryNames[industryId] || "",
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not add this category.");
      setCategoryNames((current) => ({ ...current, [industryId]: "" }));
      setNotice(`${result.category.name} added.`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not add this category."
      );
    } finally {
      setSavingIndustryId("");
    }
  }

  async function assignIndustry(userId: string, industryId: string) {
    setSavingUserId(userId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/industries/assign", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, industryId: industryId || null }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not update this assignment.");
      setNotice("Industry assignment updated.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not update this assignment."
      );
    } finally {
      setSavingUserId("");
    }
  }

  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-2xl border-[1px] border-black/30  bg-white p-5 sm:p-6">
        <h2 className="font-semibold">Industry catalog</h2>
        <p className="mt-1 text-sm text-[#657286]">
          Add industries, then create six subcategories under each one. Interns
          choose from those categories when recording a new lead.
        </p>
        <form
          onSubmit={addIndustry}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={80}
            placeholder="For example, e-commerce and retail"
            className="min-w-0 flex-1 rounded-xl border-[1px] border-black/30 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#07121f]/15"
          />
          <button
            disabled={pending}
            className="rounded-xl bg-[#07121f] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add industry"}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}

        {industries.length ? (
          <div className="mt-5 space-y-4 gap-2 grid grid-cols-3">
            {industries.map((industry) => {
              const assigned = teammates.filter(
                (teammate) => teammate.industryId === industry.id
              );
              const full = industry.categories.length >= 6;
              return (
                <article
                  key={industry.id}
                  className="rounded-2xl border-[1px] border-black/30 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{industry.name}</h3>
                      <p className="mt-1 text-xs text-[#657286]">
                        {assigned.length} assigned{" "}
                        {assigned.length === 1 ? "intern" : "interns"} ·{" "}
                        {industry.prospectCount} prospects ·{" "}
                        {industry.clientCount} clients
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f4f6f9] px-3 py-1.5 text-[10px] font-semibold">
                      {industry.categories.length} / 6 categories
                    </span>
                  </div>
                  <form
                    onSubmit={(event) => addCategory(event, industry.id)}
                    className="mt-4 flex flex-col gap-2 sm:flex-row"
                  >
                    <input
                      value={categoryNames[industry.id] || ""}
                      onChange={(event) =>
                        setCategoryNames((current) => ({
                          ...current,
                          [industry.id]: event.target.value,
                        }))
                      }
                      required
                      maxLength={80}
                      disabled={full || savingIndustryId === industry.id}
                      placeholder={
                        full
                          ? "Six categories added"
                          : "For example, online vendors"
                      }
                      className="min-w-0 flex-1 rounded-lg border-[1px] border-black/30 px-3 py-2.5 text-xs disabled:bg-[#f4f6f9]"
                    />
                    <button
                      disabled={full || savingIndustryId === industry.id}
                      className="rounded-lg border-[1px] border-black/30 px-4 py-2.5 text-xs font-semibold disabled:opacity-50"
                    >
                      {savingIndustryId === industry.id
                        ? "Adding…"
                        : "Add category"}
                    </button>
                  </form>
                  {industry.categories.length ? (
                    <div className="mt-4 overflow-x-auto rounded-xl border border-black/20">
                      <table className="w-full min-w-[650px] text-left text-xs">
                        <thead className="bg-[#f4f6f9] text-[10px] uppercase tracking-[0.1em] text-[#657286]">
                          <tr>
                            <th className="px-4 py-2.5">Subcategory</th>
                            <th className="px-4 py-2.5">Interns</th>
                            <th className="px-4 py-2.5">Reached today</th>
                            <th className="px-4 py-2.5">Prospects</th>
                            <th className="px-4 py-2.5">Clients</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/10">
                          {industry.categories.map((category) => (
                            <tr key={category.id}>
                              <td className="px-4 py-3 font-medium">
                                {category.name}
                              </td>
                              <td className="px-4 py-3">
                                {category.assignedInterns}
                              </td>
                              <td className="px-4 py-3">
                                {category.todayBusinesses}
                              </td>
                              <td className="px-4 py-3 font-semibold">
                                {category.prospectCount}
                              </td>
                              <td className="px-4 py-3">
                                {category.clientCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-lg bg-[#f4f6f9] p-3 text-xs text-[#657286]">
                      Add six categories before interns in this industry can
                      record new leads.
                    </p>
                  )}
                  {industry.categories.length > 0 &&
                    industry.categories.length < 6 && (
                      <p className="mt-2 text-[11px] text-amber-700">
                        Add {6 - industry.categories.length} more{" "}
                        {6 - industry.categories.length === 1
                          ? "category"
                          : "categories"}{" "}
                        to complete this industry.
                      </p>
                    )}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-[#f4f6f9] p-4 text-sm text-[#657286]">
            Add an industry to create its six subcategories and assign interns.
          </p>
        )}
      </section>

      <section className="rounded-2xl border-[1px] border-black/30 bg-white p-5 sm:p-6">
        <h2 className="font-semibold">Performance leaders</h2>
        <p className="mt-1 text-sm text-[#657286]">
          Compare prospects by industry and subcategory, then check today&apos;s
          reach.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <article className="rounded-xl bg-[#f4f6f9] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#657286]">
              Leading industry · prospects
            </p>
            <p className="mt-2 font-semibold">
              {topIndustry?.name || "No data yet"}
            </p>
            <p className="mt-1 text-xs text-[#657286]">
              {topIndustry
                ? `${topIndustry.prospectCount} prospects · ${topIndustry.clientCount} clients`
                : "Prospects will appear as interns update lead stages."}
            </p>
          </article>
          <article className="rounded-xl bg-[#f4f6f9] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#657286]">
              Leading subcategory · prospects
            </p>
            <p className="mt-2 font-semibold">
              {topCategory
                ? `${topCategory.name} · ${topCategory.industryName}`
                : "No data yet"}
            </p>
            <p className="mt-1 text-xs text-[#657286]">
              {topCategory
                ? `${topCategory.prospectCount} prospects · ${topCategory.clientCount} clients · ${topCategory.todayBusinesses} reached today`
                : "Subcategory results will appear here."}
            </p>
          </article>
        </div>
        {categories.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-xl border border-black/20">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-[#f4f6f9] text-[10px] uppercase tracking-[0.1em] text-[#657286]">
                <tr>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">Subcategory</th>
                  <th className="px-4 py-3">Reached today</th>
                  <th className="px-4 py-3">Prospects</th>
                  <th className="px-4 py-3">Clients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-4 py-3">{category.industryName}</td>
                    <td className="px-4 py-3 font-medium">{category.name}</td>
                    <td className="px-4 py-3">{category.todayBusinesses}</td>
                    <td className="px-4 py-3 font-semibold">
                      {category.prospectCount}
                    </td>
                    <td className="px-4 py-3">{category.clientCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border-[1px] border-black/30 bg-white">
        <div className="border-b border-black/20 p-5">
          <h2 className="font-semibold">Intern assignments</h2>
          <p className="mt-1 text-sm text-[#657286]">
            Each intern can work in one assigned industry and select from its
            six subcategories.
          </p>
        </div>
        {teammates.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#f4f6f9] text-[10px] uppercase tracking-[0.12em] text-[#657286]">
                <tr>
                  <th className="px-5 py-3">Teammate</th>
                  <th className="px-5 py-3">Industry</th>
                  <th className="px-5 py-3">Clients</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/20">
                {teammates.map((teammate) => (
                  <tr key={teammate.userId}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{teammate.name}</p>
                      <p className="mt-1 text-xs text-[#657286]">
                        {teammate.jobTitle || "Sales intern"} · {teammate.email}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        aria-label={`Industry for ${teammate.name}`}
                        value={teammate.industryId || ""}
                        disabled={
                          savingUserId === teammate.userId ||
                          industries.length === 0
                        }
                        onChange={(event) =>
                          assignIndustry(teammate.userId, event.target.value)
                        }
                        className="w-full max-w-xs rounded-lg border-[1px] border-black/30 bg-white px-3 py-2 text-xs"
                      >
                        <option value="">Unassigned</option>
                        {industries.map((industry) => (
                          <option key={industry.id} value={industry.id}>
                            {industry.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      {teammate.clientCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-10 text-center text-sm text-[#657286]">
            No active interns are on the team yet.
          </p>
        )}
      </section>
    </div>
  );
}
