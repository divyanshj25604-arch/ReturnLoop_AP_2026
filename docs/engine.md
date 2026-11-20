# Return Loop — Decision Intelligence Recommendation Engine

**Author:** Shreyansh Rathaur (SR), Database Architect & Engine Engineer  
**Specification:** `docs/TEAM_PLAN.md` Steps 12, 17, 21, and 26  
**Implementation:** `src/services/recommendation.service.js`  
**Test Suite:** `tests/recommendation.service.test.js` (100% pass)

---

## 1. Overview & Purpose

The Return Loop recommendation engine is a pure, deterministic decision intelligence service. It evaluates returned products following physical and functional warehouse inspections to recommend the optimal disposition pathway among six industry-standard alternatives:

1. **Resell** — Direct secondary-market liquidation or open-box resale.
2. **Refurbish** — Technical restoration, component repair, and repackaging for higher secondary recovery.
3. **Exchange** — Allocation to pristine replacement inventory for warranty fulfillment.
4. **Donate** — Charitable transfer for social impact and corporate tax write-off.
5. **Recycle** — Environmentally compliant e-waste disassembly and raw material salvage.
6. **Write-off** — Complete decommissioning and loss recognition when all recovery channels yield zero or negative value.

The engine evaluates all six alternatives simultaneously, computes financial recovery, assesses operational feasibility, breaks ties deterministically, computes a statistical confidence score, and synthesizes plain-English rationales for human warehouse supervisors.

---

## 2. Input Parameters

The engine function accepts a single object containing:

```js
recommend({ product, inspection, returnInfo })
```

| Parameter | Type | Required Fields | Notes |
| :--- | :--- | :--- | :--- |
| `product` | Object | `retail_price` | Product catalog retail price (INR). Defaults to `0` if omitted or negative. |
| `inspection` | Object | `condition_grade`, `functional_status`, `repair_estimate`, `has_original_packaging`, `has_all_accessories` | Physical and functional diagnostic outcomes recorded by warehouse inspector. |
| `returnInfo` | Object | `return_reason` (optional) | Customer return reason context. |

### Derived Variables
* **$P$ (Retail Price):** `Math.max(0, Number(product.retail_price) || 0)`
* **$R$ (Repair Estimate):** `Math.max(0, Number(inspection.repair_estimate) || 0)`
* **$H$ (Handling Cost):** `Math.max(200, 0.01 * P)` (minimum processing floor of ₹200 or 1% of retail value).
* **$G$ (Condition Grade Factor):**
  * `Excellent` $\rightarrow 0.85$ (pristine cosmetic condition)
  * `Good` $\rightarrow 0.70$ (minor cosmetic blemishes)
  * `Fair` $\rightarrow 0.50$ (visible wear and scratches)
  * `Damaged` $\rightarrow 0.25$ (heavy physical damage)

---

## 3. Disposition Rules & Decision Matrix

Each candidate disposition is evaluated using distinct economic and operational feasibility criteria:

| Disposition | Estimated Revenue | Estimated Cost | Feasibility Score Rules |
| :--- | :--- | :--- | :--- |
| **Resell** | $P \times G$ | $H$ | • Fully Functional + Excellent/Good: `0.95`<br>• Fully Functional + Fair: `0.60`<br>• Minor Glitch: `0.30`<br>• Otherwise: `0.00` |
| **Refurbish** | $P \times 0.65$ | $R + H$ | • If $P > 0$ and $R > 0.6 \times P$: `0.10` (uneconomical repair)<br>• Else if Minor Glitch: `0.90`<br>• Else if Defective Hardware: `0.80`<br>• Else if Fully Functional: `0.50`<br>• Else if Non-functional: `0.20`<br>• Otherwise: `0.10` |
| **Exchange** | $P \times G$ | $H$ | • Fully Functional + Excellent + original packaging + all accessories: `0.90`<br>• Fully Functional + Good: `0.50`<br>• Otherwise: `0.00` |
| **Donate** | $P \times 0.10$ | $H$ | • Fully Functional or Minor Glitch: `0.70`<br>• Otherwise: `0.10` |
| **Recycle** | $P \times 0.03$ | $H \times 0.5$ | • Always feasible: `1.00` |
| **Write-off** | `0.00` | `0.00` | • Always feasible: `1.00` |

---

## 4. Scoring, Ranking & Tie-Breaking

1. **Net Expected Recovery:**
   $$\text{net\_expected\_recovery} = \text{roundMoney}(\text{estimated\_revenue} - \text{estimated\_cost})$$
2. **Ranking Score:**
   $$\text{score} = \text{roundScore}(\text{net\_expected\_recovery} \times \text{feasibility\_score})$$
3. **Sorting & Ranking:**
   - Candidate alternatives are sorted by `score` in descending order.
   - **Tie-Breaking:** If two options yield the identical score, ties are broken deterministically by standard business priority order:
     $$\text{Resell} \succ \text{Refurbish} \succ \text{Exchange} \succ \text{Donate} \succ \text{Recycle} \succ \text{Write-off}$$
4. **Recommendation:**
   - The rank 1 alternative has `is_recommended: true` and determines `recommended_disposition`.
   - All other alternatives (ranks 2 through 6) have `is_recommended: false`.

---

## 5. Confidence Score Calculation

The recommendation engine measures algorithmic certainty using the score differential between the first-choice alternative ($s_1$) and the runner-up ($s_2$):

* If $s_1 \le 0$:
  $$\text{confidence\_score} = 0.500$$
  *(When no positive recovery pathway exists, baseline neutral confidence is assigned).*
* If $s_1 > 0$:
  $$\text{confidence\_score} = \text{roundScore}\left(\text{clamp}\left(0.5 + 0.5 \times \frac{s_1 - s_2}{s_1}, 0, 1\right)\right)$$

### Behavioral Properties:
* **Clear Winner:** When $s_1 \gg s_2$ (e.g. $s_1 = 48636$, $s_2 = 16539$), $\frac{s_1 - s_2}{s_1} \approx 0.66$, yielding confidence $> 0.800$.
* **Close Call:** When two alternatives have nearly identical scores (e.g. Resell vs Exchange on an open-box return), $s_1 \approx s_2 \implies \text{confidence} \approx 0.500$ to $0.550$, alerting the supervisor that either option is viable.
* **Dominant Recovery:** When $s_2 \le 0$ and $s_1 > 0$, $(s_1 - s_2) / s_1 \ge 1.0$, clamping confidence to $1.000$.

---

## 6. Plain-English Rationale Generation

Every alternative includes a non-empty, contextual plain-English explanation explaining its ranking:
* Explains why the option was recommended or discounted based on physical condition (`condition_grade`), hardware diagnostics (`functional_status`), packaging/accessory presence, and repair cost vs. retail price ratio.
* Highlights economic trade-offs (e.g. repair cost exceeding 60% of retail price makes refurbishment unviable).

---

## 7. Evolution & Changes Across Steps

1. **Step 12 (Baseline):** Initial scoring engine implemented; placeholder confidence of `0.5` and empty rationales.
2. **Step 17 (Dynamic Confidence & Rationale):** Implemented dynamic spread-based confidence formula and comprehensive plain-English rationales.
3. **Step 21 (Hardening & Edge Cases):** Verified across 99 unit test cases including $P=0$, missing fields, extreme repair estimates, and full grade $\times$ status combinations.
4. **Step 26 (Documentation):** Complete architectural specification and mathematical documentation added to repository.
