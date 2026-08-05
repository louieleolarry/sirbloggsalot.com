import React from 'react';

const SkeletonLoader = () => (
  <div className="animate-pulse">
    {/* Header skeleton */}
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12 py-4">
      <div className="flex-1">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between w-full">
          <div>
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-2"></div>
            <div className="flex items-center gap-2 flex-wrap mt-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 bg-gray-200 rounded-full w-20"></div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2 lg:mt-0">
            <div className="h-10 bg-gray-200 rounded w-32"></div>
            <div className="h-10 bg-gray-200 rounded w-36"></div>
          </div>
        </div>
      </div>
    </div>

    {/* Table skeleton */}
    <div className="w-full overflow-x-auto pb-8">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="px-6 py-5">
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
            </th>
            <th className="px-6 py-5 text-left">
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </th>
            <th className="px-6 py-5 text-left hidden md:table-cell">
              <div className="h-6 bg-gray-200 rounded w-28"></div>
            </th>
            <th className="px-6 py-5 text-right w-24">
              <div className="h-6 bg-gray-200 rounded w-16 ml-auto"></div>
            </th>
            <th className="px-6 py-5 text-left hidden md:table-cell min-w-[180px] w-[200px]">
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </th>
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <tr key={i} className="border-b">
              <td className="px-6 py-4">
                <div className="h-5 w-5 bg-gray-200 rounded"></div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 bg-gray-200 rounded w-64"></div>
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <div className="h-4 bg-gray-200 rounded w-40"></div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex justify-end gap-2">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                </div>
              </td>
              <td className="px-6 py-4 hidden md:table-cell">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default SkeletonLoader;
